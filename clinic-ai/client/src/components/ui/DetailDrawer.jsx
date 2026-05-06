export default function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-base-100 shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-base-200 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        </div>
      </aside>
    </>
  );
}
