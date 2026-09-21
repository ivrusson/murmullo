(function () {
  var internals = window.__TAURI_INTERNALS__;
  var label =
    internals &&
    internals.metadata &&
    internals.metadata.currentWindow &&
    internals.metadata.currentWindow.label;
  if (label === 'crash-reporter') return;
  if (window.__murmulloCrashCapture) return;
  window.__murmulloCrashCapture = true;

  var reporting = false;

  function invokeReport(message, stack, source) {
    if (reporting) return;
    var invoke =
      window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke;
    if (typeof invoke !== 'function') return;
    reporting = true;
    invoke('report_frontend_crash', {
      message: String(message || 'Unknown error'),
      stack: stack ? String(stack) : null,
      source: source || 'window',
    })
      .catch(function () {})
      .then(function () {
        setTimeout(function () {
          reporting = false;
        }, 2500);
      });
  }

  window.addEventListener('error', function (event) {
    var error = event.error;
    var message =
      error && error.message
        ? error.message
        : event.message || 'Unhandled error';
    var stack = error && error.stack ? error.stack : undefined;
    invokeReport(message, stack, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var message =
      reason && reason.message
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    var stack = reason && reason.stack ? reason.stack : undefined;
    invokeReport(message, stack, 'unhandledrejection');
  });
})();
