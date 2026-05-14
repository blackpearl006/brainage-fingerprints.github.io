const callbacks = [];
let fired = false;

export function registerWarmup(cb) {
  callbacks.push(cb);
}

function fireAll() {
  if (fired) return;
  fired = true;
  callbacks.forEach((cb, i) => setTimeout(cb, 450 * i));
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) requestIdleCallback(fireAll);
    else setTimeout(fireAll, 200);
  });
}
