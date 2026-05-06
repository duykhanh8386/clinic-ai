// Global toast event emitter — call from anywhere without needing React context
// Usage: import { toast } from "../utils/toast"; toast.success("Lưu thành công");

let _listeners = [];

function emit(type, message) {
  const item = { id: Date.now() + Math.random(), type, message };
  _listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (message) => emit("success", message),
  error: (message) => emit("error", message),
  info: (message) => emit("info", message),
  warning: (message) => emit("warning", message),
};

export function subscribeToast(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}
