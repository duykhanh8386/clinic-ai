// Global confirm dialog — call from anywhere without needing React context
// Usage: import { confirmDialog } from "../utils/confirm";
//        const ok = await confirmDialog("Bạn có chắc?");
//        if (!ok) return;

let _pendingResolve = null;
let _listener = null;

export function confirmDialog(message, options = {}) {
  return new Promise((resolve) => {
    _pendingResolve = resolve;
    if (_listener) _listener({ message, options });
  });
}

export function subscribeConfirm(fn) {
  _listener = fn;
  return () => {
    _listener = null;
  };
}

export function resolveConfirm(result) {
  if (_pendingResolve) {
    _pendingResolve(result);
    _pendingResolve = null;
  }
}
