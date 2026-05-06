import { useEffect, useState } from "react";
import { subscribeToast } from "../../utils/toast";

const ICONS = {
  success: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: "bg-emerald-500 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-amber-400 text-white",
  info: "bg-sky-500 text-white",
};

const DURATION = 4000;

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = subscribeToast((item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, DURATION);
    });
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[2147483647] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium
            pointer-events-auto min-w-56 max-w-xs
            animate-[fadeInDown_0.25s_ease]
            ${STYLES[item.type] || STYLES.info}`}
          style={{ animation: "fadeInDown 0.25s ease" }}
        >
          {ICONS[item.type]}
          <span className="flex-1">{item.message}</span>
          <button
            className="opacity-70 hover:opacity-100 ml-1"
            onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
