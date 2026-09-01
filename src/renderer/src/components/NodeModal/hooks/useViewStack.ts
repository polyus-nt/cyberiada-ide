import { useCallback, useState } from 'react';

export type ViewStackEntry<T extends string> = {
  view: T;
  title: string;
};

// Хук для управления окнами внутри 1 модального окна

export const useViewStack = <T extends string>(initial: ViewStackEntry<T>) => {
  const [stack, setStack] = useState<ViewStackEntry<T>[]>([initial]);

  const currentEntry = stack[stack.length - 1];
  const currentView = currentEntry.view;
  const canGoBack = stack.length > 1;

  // Добавление нового окна в стек
  const push = useCallback((entry: ViewStackEntry<T>) => {
    setStack((prev) => [...prev, entry]);
  }, []);

  // Удаление текущего окна из стека
  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Сброс стека до начального окна
  const reset = useCallback(
    (entry?: ViewStackEntry<T>) => {
      setStack([entry ?? initial]);
    },
    [initial]
  );
  return { currentView, currentTitle: currentEntry.title, canGoBack, push, pop, reset };
};
