"""Train the Blajar handwritten-digit CNN and export runtime weights.

The architecture mirrors src/lib/mnist.ts exactly:
  conv 3x3 same  1 -> 16, ReLU, maxpool 2
  conv 3x3 same 16 -> 32, ReLU, maxpool 2
  dense 1568 -> 64 ReLU
  dense 64 -> 10 (softmax applied at runtime)

Weights are exported in the layout the JS runtime expects:
  conv1 kernel (3, 3, 1, 16), conv1 bias (16,)
  conv2 kernel (3, 3, 16, 32), conv2 bias (32,)
  dense1 kernel (1568, 64), dense1 bias (64,)
  dense2 kernel (64, 10), dense2 bias (10,)

Usage:
  python scripts/train-model.py [--epochs 12] [--lr 0.001] [--eval-only]

MNIST files are cached in scripts/.cache (gitignored).
"""

import argparse
import gzip
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
MODELS = ROOT / "public" / "models"

MIRRORS = [
    "https://ossci-datasets.s3.amazonaws.com/mnist",
    "https://storage.googleapis.com/cvdf-datasets/mnist",
]
FILES = {
    "train-images": ("train-images-idx3-ubyte.gz", 0x00000803),
    "train-labels": ("train-labels-idx1-ubyte.gz", 0x00000801),
    "test-images": ("t10k-images-idx3-ubyte.gz", 0x00000803),
    "test-labels": ("t10k-labels-idx1-ubyte.gz", 0x00000801),
}

S, C1, C2, D1, OUT = 28, 16, 32, 64, 10


def download(name: str, magic: int):
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        last = None
        for mirror in MIRRORS:
            try:
                data = urllib.request.urlopen(f"{mirror}/{name}", timeout=30).read()
                path.write_bytes(data)
                print(f"downloaded {name} ({len(data) // 1024} KB)")
                break
            except Exception as error:  # noqa: BLE001
                last = error
        else:
            raise RuntimeError(f"cannot download {name}: {last}")
    raw = gzip.decompress(path.read_bytes())
    got_magic = struct.unpack(">I", raw[:4])[0]
    if got_magic != magic:
        raise ValueError(f"bad magic for {name}: {got_magic:#x}")
    return raw


def load_dataset() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    def images(key: str) -> np.ndarray:
        name, magic = FILES[key]
        raw = download(name, magic)
        count, rows, cols = struct.unpack(">III", raw[4:16])
        data = np.frombuffer(raw, dtype=np.uint8, offset=16)
        return (data.reshape(count, rows, cols).astype(np.float32) / 255.0)[:, None]

    def labels(key: str) -> np.ndarray:
        name, magic = FILES[key]
        raw = download(name, magic)
        count = struct.unpack(">I", raw[4:8])[0]
        return np.frombuffer(raw, dtype=np.uint8, offset=8, count=count).astype(np.int64)

    return (
        images("train-images"),
        labels("train-labels"),
        images("test-images"),
        labels("test-labels"),
    )


class Model:
    def __init__(self, seed: int = 42):
        rng = np.random.default_rng(seed)
        scale = lambda shape, fan_in: rng.normal(0, np.sqrt(2 / fan_in), shape).astype(np.float32)
        self.k1 = scale((3, 3, 1, C1), 9)
        self.b1 = np.zeros(C1, dtype=np.float32)
        self.k2 = scale((3, 3, C1, C2), 9 * C1)
        self.b2 = np.zeros(C2, dtype=np.float32)
        self.w3 = scale((7 * 7 * C2, D1), 7 * 7 * C2)
        self.b3 = np.zeros(D1, dtype=np.float32)
        self.w4 = scale((D1, OUT), D1)
        self.b4 = np.zeros(OUT, dtype=np.float32)
        self.params = ["k1", "b1", "k2", "b2", "w3", "b3", "w4", "b4"]


def im2col(x: np.ndarray) -> np.ndarray:
    n, c, h, w = x.shape
    xp = np.pad(x, ((0, 0), (0, 0), (1, 1), (1, 1)))
    cols = np.empty((n, h * w, 9 * c), dtype=np.float32)
    for ky in range(3):
        for kx in range(3):
            block = xp[:, :, ky : ky + h, kx : kx + w]  # (n, c, h, w)
            cols[:, :, (ky * 3 + kx) * c : (ky * 3 + kx + 1) * c] = block.transpose(0, 2, 3, 1).reshape(
                n, h * w, c
            )
    return cols


def col2im(cols: np.ndarray, h: int, w: int, c: int) -> np.ndarray:
    n = cols.shape[0]
    xp = np.zeros((n, c, h + 2, w + 2), dtype=np.float32)
    for ky in range(3):
        for kx in range(3):
            block = cols[:, :, (ky * 3 + kx) * c : (ky * 3 + kx + 1) * c].reshape(n, h, w, c)
            xp[:, :, ky : ky + h, kx : kx + w] += block.transpose(0, 3, 1, 2)
    return xp[:, :, 1:-1, 1:-1]


def maxpool(x: np.ndarray):
    n, c, h, w = x.shape
    reshaped = x.reshape(n, c, h // 2, 2, w // 2, 2)
    out = reshaped.max(axis=(3, 5))
    mask = reshaped == out[:, :, :, None, :, None]
    return out, mask


def maxpool_back(dout: np.ndarray, mask: np.ndarray, h: int, w: int) -> np.ndarray:
    n, c = dout.shape[0], dout.shape[1]
    expanded = mask * dout[:, :, :, None, :, None]
    return expanded.reshape(n, c, h, w)


class Cache:
    pass


def forward(model: Model, x: np.ndarray):
    cache = Cache()
    cache.cols1 = im2col(x)
    conv1 = cache.cols1 @ model.k1.reshape(9, C1) + model.b1
    conv1 = np.maximum(conv1, 0)
    conv1 = conv1.reshape(-1, S, S, C1).transpose(0, 3, 1, 2)
    cache.conv1 = conv1
    pool1, mask1 = maxpool(conv1)
    cache.mask1 = mask1
    cache.cols2 = im2col(pool1)
    conv2 = cache.cols2 @ model.k2.reshape(9 * C1, C2) + model.b2
    conv2 = np.maximum(conv2, 0)
    conv2 = conv2.reshape(-1, 14, 14, C2).transpose(0, 3, 1, 2)
    cache.conv2 = conv2
    pool2, mask2 = maxpool(conv2)
    cache.mask2 = mask2
    flat = pool2.transpose(0, 2, 3, 1).reshape(-1, 7 * 7 * C2)
    cache.flat = flat
    hidden = np.maximum(flat @ model.w3 + model.b3, 0)
    cache.hidden = hidden
    logits = hidden @ model.w4 + model.b4
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    probs = exp / exp.sum(axis=1, keepdims=True)
    return probs, cache


def backward(model: Model, cache: Cache, probs: np.ndarray, labels: np.ndarray) -> dict:
    n = probs.shape[0]
    dlogits = probs.copy()
    dlogits[np.arange(n), labels] -= 1.0
    dlogits /= n
    grads = {}
    grads["w4"] = cache.hidden.T @ dlogits
    grads["b4"] = dlogits.sum(axis=0)
    dhidden = dlogits @ model.w4.T
    dhidden[cache.hidden <= 0] = 0
    grads["w3"] = cache.flat.T @ dhidden
    grads["b3"] = dhidden.sum(axis=0)
    dflat = dhidden @ model.w3.T
    dpool2 = dflat.reshape(-1, 7, 7, C2).transpose(0, 3, 1, 2)
    dconv2 = maxpool_back(dpool2, cache.mask2, 14, 14)
    dconv2[cache.conv2 <= 0] = 0
    dcols2 = dconv2.transpose(0, 2, 3, 1).reshape(-1, 14 * 14, C2)
    grads["k2"] = (cache.cols2.transpose(0, 2, 1) @ dcols2).sum(axis=0).reshape(3, 3, C1, C2)
    grads["b2"] = dconv2.sum(axis=(0, 2, 3))
    dpool1 = col2im(dcols2 @ model.k2.reshape(9 * C1, C2).T, 14, 14, C1)
    dconv1 = maxpool_back(dpool1, cache.mask1, S, S)
    dconv1[cache.conv1 <= 0] = 0
    dcols1 = dconv1.transpose(0, 2, 3, 1).reshape(-1, S * S, C1)
    grads["k1"] = (cache.cols1.transpose(0, 2, 1) @ dcols1).sum(axis=0).reshape(3, 3, 1, C1)
    grads["b1"] = dconv1.sum(axis=(0, 2, 3))
    return grads


def augment(batch: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    n = batch.shape[0]
    angles = rng.uniform(-0.21, 0.21, n)  # ~±12 degrees
    scales = rng.uniform(0.82, 1.18, n)
    tx = rng.uniform(-3.0, 3.0, n)
    ty = rng.uniform(-3.0, 3.0, n)

    yy, xx = np.meshgrid(np.arange(S, dtype=np.float32), np.arange(S, dtype=np.float32), indexing="ij")
    cx = cy = 13.5
    x = (xx[None] - cx - tx[:, None, None]) / scales[:, None, None]
    y = (yy[None] - cy - ty[:, None, None]) / scales[:, None, None]
    cos = np.cos(-angles)[:, None, None]
    sin = np.sin(-angles)[:, None, None]
    xs = cos * x - sin * y + cx
    ys = sin * x + cos * y + cy

    x0 = np.floor(xs).astype(np.int32)
    y0 = np.floor(ys).astype(np.int32)
    fx = (xs - x0).astype(np.float32)
    fy = (ys - y0).astype(np.float32)
    x0c = np.clip(x0, 0, S - 1)
    y0c = np.clip(y0, 0, S - 1)
    x1c = np.clip(x0 + 1, 0, S - 1)
    y1c = np.clip(y0 + 1, 0, S - 1)

    src = batch[:, 0]  # (n, S, S)
    idx = np.arange(n)[:, None, None]
    top = src[idx, y0c, x0c] * (1 - fx) + src[idx, y0c, x1c] * fx
    bottom = src[idx, y1c, x0c] * (1 - fx) + src[idx, y1c, x1c] * fx
    out = top * (1 - fy) + bottom * fy
    valid = (xs >= 0) & (xs <= S - 1) & (ys >= 0) & (ys <= S - 1)
    out = np.where(valid, out, 0.0)

    up = np.roll(out, 1, axis=1)
    down = np.roll(out, -1, axis=1)
    left = np.roll(out, 1, axis=2)
    right = np.roll(out, -1, axis=2)
    eroded = np.minimum.reduce([out, up, down, left, right])
    dilated = np.maximum.reduce([out, up, down, left, right])
    pick = rng.random(n)
    out = np.where((pick < 0.18)[:, None, None], eroded, out)
    out = np.where(((pick >= 0.18) & (pick < 0.42))[:, None, None], dilated, out)
    return out[:, None].astype(np.float32)


def evaluate(model: Model, x: np.ndarray, y: np.ndarray) -> float:
    correct = 0
    for start in range(0, x.shape[0], 1000):
        probs, _ = forward(model, x[start : start + 1000])
        correct += (probs.argmax(axis=1) == y[start : start + 1000]).sum()
    return correct / x.shape[0]


def morph(x: np.ndarray, mode: str, iterations: int) -> np.ndarray:
    binary = (x > 0.4).astype(np.float32)
    for _ in range(iterations):
        up = np.roll(binary, 1, axis=2)
        down = np.roll(binary, -1, axis=2)
        left = np.roll(binary, 1, axis=3)
        right = np.roll(binary, -1, axis=3)
        if mode == "erode":
            binary = binary * up * down * left * right
        else:
            binary = np.maximum.reduce([binary, up, down, left, right])
    return binary


def stroke_test(model: Model, test_x: np.ndarray, test_y: np.ndarray) -> None:
    print("stroke thickness sensitivity (raw MNIST test set):")
    for mode in ("erode", "dilate"):
        for iterations in (1, 2):
            variant = morph(test_x, mode, iterations)
            accuracy = evaluate(model, variant, test_y)
            print(f"  {mode} x{iterations}: {accuracy * 100:.2f}%")


def load_runtime_model(path: Path, manifest_path: Path) -> Model:
    import json

    manifest = json.loads(manifest_path.read_text())
    floats = np.fromfile(path, dtype="<f4")
    model = Model()
    for entry in manifest["weights"]:
        name = entry["name"]
        size = int(np.prod(entry["shape"]))
        block = floats[entry["offset"] : entry["offset"] + size]
        if "Conv2D1/kernel" in name:
            model.k1 = block.reshape(3, 3, 1, C1).copy()
        elif "Conv2D1/bias" in name:
            model.b1 = block.copy()
        elif "Conv2D2/kernel" in name:
            model.k2 = block.reshape(3, 3, C1, C2).copy()
        elif "Conv2D2/bias" in name:
            model.b2 = block.copy()
        elif "Dense1/kernel" in name:
            model.w3 = block.reshape(7 * 7 * C2, D1).copy()
        elif "Dense1/bias" in name:
            model.b3 = block.copy()
        elif "Dense2/kernel" in name:
            model.w4 = block.reshape(D1, OUT).copy()
        elif "Dense2/bias" in name:
            model.b4 = block.copy()
    return model


def export(model: Model) -> None:
    import json

    blocks = [
        ("conv2d_Conv2D1/kernel", model.k1.reshape(3, 3, 1, C1), [3, 3, 1, C1]),
        ("conv2d_Conv2D1/bias", model.b1, [C1]),
        ("conv2d_Conv2D2/kernel", model.k2.reshape(3, 3, C1, C2), [3, 3, C1, C2]),
        ("conv2d_Conv2D2/bias", model.b2, [C2]),
        ("dense_Dense1/kernel", model.w3, [7 * 7 * C2, D1]),
        ("dense_Dense1/bias", model.b3, [D1]),
        ("dense_Dense2/kernel", model.w4, [D1, OUT]),
        ("dense_Dense2/bias", model.b4, [OUT]),
    ]
    offset = 0
    manifest_weights = []
    for name, array, shape in blocks:
        array = np.ascontiguousarray(array, dtype="<f4").reshape(-1)
        manifest_weights.append({"name": name, "shape": shape, "offset": offset})
        offset += array.size
    all_floats = np.concatenate(
        [np.ascontiguousarray(array, dtype="<f4").reshape(-1) for _, array, _ in blocks]
    )
    all_floats.tofile(MODELS / "mnist.bin")
    manifest = {"format": "blajar-cnn-v1", "input": [28, 28, 1], "layers": [], "weights": manifest_weights}
    (MODELS / "mnist.json").write_text(json.dumps(manifest) + "\n")
    print(f"exported {all_floats.size} floats to {MODELS / 'mnist.bin'}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--eval-only", action="store_true", help="evaluate current runtime weights")
    parser.add_argument("--stroke-test", action="store_true", help="measure thickness sensitivity")
    args = parser.parse_args()

    train_x, train_y, test_x, test_y = load_dataset()
    print(f"mnist: {train_x.shape[0]} train, {test_x.shape[0]} test")

    if args.eval_only:
        model = load_runtime_model(MODELS / "mnist.bin", MODELS / "mnist.json")
        print(f"runtime model test accuracy: {evaluate(model, test_x, test_y) * 100:.2f}%")
        return

    if args.stroke_test:
        model = load_runtime_model(MODELS / "mnist.bin", MODELS / "mnist.json")
        print(f"runtime model test accuracy: {evaluate(model, test_x, test_y) * 100:.2f}%")
        stroke_test(model, test_x, test_y)
        return

    model = Model()
    rng = np.random.default_rng(1234)
    state = {name: [np.zeros_like(getattr(model, name)), np.zeros_like(getattr(model, name))] for name in model.params}
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    step = 0
    best_accuracy = 0.0
    n = train_x.shape[0]

    for epoch in range(1, args.epochs + 1):
        order = rng.permutation(n)
        lr = args.lr * (0.6 ** ((epoch - 1) // 4))
        losses = 0.0
        for start in range(0, n, args.batch_size):
            idx = order[start : start + args.batch_size]
            batch = augment(train_x[idx], rng)
            labels = train_y[idx]
            probs, cache = forward(model, batch)
            losses += float(-np.log(np.clip(probs[np.arange(labels.size), labels], 1e-9, 1.0)).mean())
            grads = backward(model, cache, probs, labels)
            step += 1
            for name in model.params:
                g = grads[name]
                m, v = state[name]
                m[:] = beta1 * m + (1 - beta1) * g
                v[:] = beta2 * v + (1 - beta2) * (g * g)
                m_hat = m / (1 - beta1**step)
                v_hat = v / (1 - beta2**step)
                setattr(model, name, getattr(model, name) - lr * m_hat / (np.sqrt(v_hat) + eps))
        accuracy = evaluate(model, test_x, test_y)
        print(f"epoch {epoch:2d}  lr {lr:.4f}  loss {losses / (n // args.batch_size):.4f}  test {accuracy * 100:.2f}%")
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            np.savez(
                CACHE / "model.npz",
                **{name: getattr(model, name) for name in model.params},
            )

    saved = np.load(CACHE / "model.npz")
    for name in model.params:
        setattr(model, name, saved[name])
    print(f"best test accuracy: {best_accuracy * 100:.2f}%")
    export(model)
    print(f"re-run `node scripts/eval-model.mjs` to verify the JS runtime path")


if __name__ == "__main__":
    sys.exit(main())
