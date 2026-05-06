export default function FilterBar({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 space-y-3 ${className}`}>
      {children}
    </div>
  );
}
