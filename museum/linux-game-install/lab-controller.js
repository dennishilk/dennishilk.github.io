(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LinuxGameLab = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const emptySteps = () => ({ updated: false, searched: false, installed: false, launched: false });
  const stepForAction = Object.freeze({ updated: 'updated', searched: 'searched', installed: 'installed', launch: 'launched' });
  // The browser has one command entry point: execute once, observe the result
  // once, and render once. Rendering cannot feed a handled command back here.
  function createController(terminal, render) {
    let state = terminal.freshState(), steps = emptySteps(), dispatchDepth = 0;
    function snapshot() { return { state, steps: { ...steps }, dispatchDepth }; }
    function submit(rawCommand, source = 'keyboard') {
      if (dispatchDepth) return { handled: false, action: 'busy', output: '', source, state };
      dispatchDepth = 1;
      try {
        const command = String(rawCommand || '').trim().replace(/\s+/g, ' ');
        const result = terminal.execute(command, state);
        state = result.state;
        if (result.action === 'reset') steps = emptySteps();
        else if (stepForAction[result.action]) steps[stepForAction[result.action]] = true;
        const event = { handled: result.handled !== false, command, source, action: result.action || '', output: result.output || '', state, steps: { ...steps } };
        render(event);
        return event;
      } finally { dispatchDepth = 0; }
    }
    return { submit, snapshot };
  }
  return { createController };
});
