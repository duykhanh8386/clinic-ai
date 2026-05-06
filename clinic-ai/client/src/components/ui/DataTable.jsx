export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyText = "Không có dữ liệu.",
  onRowClick,
}) {
  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.headerClassName || ""}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center opacity-70">Đang tải...</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center opacity-70">{emptyText}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={onRowClick ? "cursor-pointer hover:bg-base-200/60" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={`${row.id}-${col.key}`} className={col.cellClassName || ""}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
