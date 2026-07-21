/**
 * Development-only logger. No-ops in production builds.
 *
 * Use `devLog` for verbose debug output that should not appear in production.
 * Use `console.warn` / `console.error` for actionable warnings that are useful
 * in production debugging (rate limits, connection issues, etc.).
 */
export const devLog = import.meta.env.DEV ? console.log.bind(console) : () => {};

export const devWarn = import.meta.env.DEV ? console.warn.bind(console) : () => {};
