let lastCall = 0;

export function rateLimitedFetch(fn, delay = 1000) {
  return (...args) => {
    const now = Date.now();
    if (now - lastCall < delay) return Promise.resolve(null);
    lastCall = now;
    return fn(...args);
  };
}
