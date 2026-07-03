import { lazy } from 'react';

const lazyRetry = <Props extends object>(
  importFn: () => Promise<{ default: React.ComponentType<Props> }>
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic chunk loading failed, triggering page reload:', error);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      throw error;
    }
  }) as React.LazyExoticComponent<React.ComponentType<Props>>;
};

export const FloatingKaraokePlayer = lazyRetry<
  import('./FloatingKaraokePlayer').FloatingKaraokePlayerProps
>(async () => {
  const m = await import('./FloatingKaraokePlayer');
  return {
    default: m.FloatingKaraokePlayer as React.ComponentType<
      import('./FloatingKaraokePlayer').FloatingKaraokePlayerProps
    >,
  };
});
