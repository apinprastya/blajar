import { useCallback, useEffect, useState } from 'react';
import { ENGLISH_MODES } from './content/english';
import { preloadModel } from './lib/handwriting';
import { LEVEL_NAMES } from './lib/math';
import type { EnglishMode, MathOp, SessionResult } from './lib/types';
import { EnglishSetupScreen } from './screens/EnglishSetup';
import { HomeScreen } from './screens/Home';
import { ListenChooseScreen } from './screens/ListenChoose';
import { MatchBoardScreen } from './screens/MatchBoard';
import { MathQuizScreen } from './screens/MathQuiz';
import { MathSetupScreen } from './screens/MathSetup';
import { ResultsScreen } from './screens/Results';
import { SentenceBuilderScreen } from './screens/SentenceBuilder';

type QuizRoute =
  | { name: 'math-quiz'; op: MathOp; level: number }
  | { name: 'english-quiz'; mode: EnglishMode; level: number };

type SetupRoute = { name: 'math-setup' } | { name: 'english-setup' };

type Route =
  | { name: 'home' }
  | SetupRoute
  | QuizRoute
  | { name: 'results'; title: string; result: SessionResult; retry: QuizRoute; setup: SetupRoute };

function quizTitle(route: QuizRoute): string {
  if (route.name === 'math-quiz') {
    return `Matematika • Level ${route.level} (${LEVEL_NAMES[route.level - 1]})`;
  }
  const mode = ENGLISH_MODES.find((item) => item.id === route.mode);
  return `Bahasa Inggris • ${mode?.name ?? ''} — Level ${route.level}`;
}

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1];

  useEffect(() => {
    preloadModel();
  }, []);

  const push = useCallback((next: Route) => setStack((current) => [...current, next]), []);
  const pop = useCallback(
    () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    [],
  );
  const replaceTop = useCallback(
    (next: Route) => setStack((current) => [...current.slice(0, -1), next]),
    [],
  );
  const goHome = useCallback(() => setStack([{ name: 'home' }]), []);

  const finishQuiz = (retry: QuizRoute, result: SessionResult) => {
    replaceTop({
      name: 'results',
      title: quizTitle(retry),
      result,
      retry,
      setup: retry.name === 'math-quiz' ? { name: 'math-setup' } : { name: 'english-setup' },
    });
  };

  switch (route.name) {
    case 'home':
      return (
        <HomeScreen
          onMath={() => push({ name: 'math-setup' })}
          onEnglish={() => push({ name: 'english-setup' })}
        />
      );
    case 'math-setup':
      return (
        <MathSetupScreen
          onBack={pop}
          onStart={(op, level) => push({ name: 'math-quiz', op, level })}
        />
      );
    case 'english-setup':
      return (
        <EnglishSetupScreen
          onBack={pop}
          onStart={(mode, level) => push({ name: 'english-quiz', mode, level })}
        />
      );
    case 'math-quiz':
      return (
        <MathQuizScreen
          op={route.op}
          level={route.level}
          onExit={pop}
          onFinish={(result) => finishQuiz(route, result)}
        />
      );
    case 'english-quiz': {
      const shared = {
        level: route.level,
        onExit: pop,
        onFinish: (result: SessionResult) => finishQuiz(route, result),
      };
      if (route.mode === 'sentence') return <SentenceBuilderScreen {...shared} />;
      if (route.mode === 'match') return <MatchBoardScreen {...shared} />;
      return <ListenChooseScreen {...shared} />;
    }
    case 'results':
      return (
        <ResultsScreen
          title={route.title}
          result={route.result}
          onRepeat={() => replaceTop(route.retry)}
          onSetup={() => replaceTop(route.setup)}
          onHome={goHome}
        />
      );
  }
}
