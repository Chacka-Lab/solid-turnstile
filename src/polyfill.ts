interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: PromiseLike<T> | T) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Polyfill for Promise.withResolvers (ES2024).
 * Implemented locally to avoid patching the global Promise in library code.
 */
export function withResolvers<T>(): PromiseWithResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
