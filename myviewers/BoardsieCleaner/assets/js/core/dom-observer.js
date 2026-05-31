// dom-observer.js

const domTasks = new Map();

let observer = null;
let debounceTimer = null;
let lastMutations = [];

export function registerDomTask(name, fn) {
  if (typeof fn !== 'function') {
    throw new Error(`registerDomTask("${name}") requires a function`);
  }

  domTasks.set(name, fn);
}

export function unregisterDomTask(name) {
  domTasks.delete(name);
}

export function runDomTasksNow(context = {}) {
  for (const [name, fn] of domTasks.entries()) {
    try {
      fn(context);
    } catch (err) {
      const message = String(err?.message || err || '');

      if (message.includes('Extension context invalidated')) {
        console.warn(
          `[BoardsCleaner] DOM observer stopped after invalidated extension context during task: ${name}`
        );
        stopDomObserver();
        clearTimeout(debounceTimer);
        return;
      }

      console.error(`[BoardsCleaner] DOM task failed: ${name}`, err);
    }
  }
}

function handleMutations(mutations) {
  lastMutations = mutations;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runDomTasksNow({
      reason: 'mutation',
      mutations: lastMutations
    });
  }, 120);
}

export function initDomObserver() {
  if (observer) return observer;

  observer = new MutationObserver(handleMutations);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  return observer;
}

export function stopDomObserver() {
  if (!observer) return;

  observer.disconnect();
  observer = null;
}

export function restartDomObserver() {
  stopDomObserver();
  return initDomObserver();
}