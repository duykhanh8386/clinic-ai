import { useEffect, useState } from "react";
import { subscribeConfirm, resolveConfirm } from "../../utils/confirm";

export default function ConfirmDialog() {
  const [state, setState] = useState(null); // { message, options } | null

  useEffect(() => {
    const unsub = subscribeConfirm((payload) => setState(payload));
    return unsub;
  }, []);

  function handleOk() {
    setState(null);
    resolveConfirm(true);
  }

  function handleCancel() {
    setState(null);
    resolveConfirm(false);
  }

  if (!state) return null;

  const isDanger = state.options?.danger;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
      <div className="bg-base-100 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-[fadeInDown_0.2s_ease]">
        <p className="text-base font-medium whitespace-pre-line leading-relaxed">
          {state.message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
            Hủy
          </button>
          <button
            className={`btn btn-sm ${isDanger ? "btn-error" : "btn-primary"}`}
            onClick={handleOk}
          >
            {isDanger ? "Xóa vĩnh viễn" : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
