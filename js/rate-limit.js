const resolveAfter = ms => new Promise(ok => setTimeout(ok, ms));

function rateLimit1(fn, msPerOp) {
  let wait = Promise.resolve();
  return (...a) => {
    // We use the queue tail in wait to start both the
    // next operation and the next delay
    const res = wait.then(() => fn(...a));
    wait = wait.then(() => resolveAfter(msPerOp));
    return res;
  };
}
