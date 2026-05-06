import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKbDocument,
  deleteKbDocument,
  getKbDocument,
  importKbExcel,
  listKbDocuments,
  processKbDocument,
  updateKbDocument,
} from "../../services/kb.service";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const tone =
    status === "PROCESSED"
      ? "badge-success"
      : status === "FAILED"
        ? "badge-error"
        : status === "PROCESSING"
          ? "badge-warning"
          : "badge-outline";

  return <span className={`badge ${tone}`}>{status}</span>;
}

export default function AdminKb() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [autoProcessImport, setAutoProcessImport] = useState(true);
  const [excelInputKey, setExcelInputKey] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const docsQ = useQuery({
    queryKey: ["kb-documents"],
    queryFn: () => listKbDocuments({ page: 1, limit: 50 }),
  });

  const detailQ = useQuery({
    queryKey: ["kb-document", selectedDocumentId],
    queryFn: () => getKbDocument(selectedDocumentId),
    enabled: Boolean(selectedDocumentId),
  });

  const documents = useMemo(() => docsQ.data?.data ?? [], [docsQ.data]);
  const selectedDocument = detailQ.data?.data;

  const createMutation = useMutation({
    mutationFn: () => createKbDocument({ title, type: "TEXT", content }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["kb-documents"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: () => importKbExcel({ file: excelFile, autoProcess: autoProcessImport }),
    onSuccess: (res) => {
      setExcelFile(null);
      setExcelInputKey((value) => value + 1);
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["kb-documents"] });
    },
  });

  const processMutation = useMutation({
    mutationFn: ({ id }) => processKbDocument(id, { chunkSize: 800, overlap: 120 }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents"] });
      queryClient.invalidateQueries({ queryKey: ["kb-document", variables.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateKbDocument(selectedDocumentId, {
      title: editTitle,
      content: editContent,
      autoProcess: true,
    }),
    onSuccess: (res) => {
      setEditTitle(res.data?.title || "");
      setEditContent(res.data?.content || "");
      setIsEditingDocument(false);
      queryClient.invalidateQueries({ queryKey: ["kb-documents"] });
      queryClient.invalidateQueries({ queryKey: ["kb-document", selectedDocumentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteKbDocument(id),
    onSuccess: (_data, variables) => {
      if (selectedDocumentId === variables.id) setSelectedDocumentId(null);
      queryClient.invalidateQueries({ queryKey: ["kb-documents"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Knowledge Base</h1>
        <p className="mt-1 text-sm opacity-70">Quản lý tài liệu FAQ nội bộ cho chatbot tiền khám.</p>
      </div>

      <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 space-y-4">
        <div className="text-sm font-semibold">Tạo tài liệu text</div>
        <input
          className="input input-bordered w-full"
          placeholder="Tiêu đề tài liệu"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="textarea textarea-bordered min-h-40 w-full"
          placeholder="Nội dung tài liệu"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            disabled={createMutation.isPending || title.trim().length < 3 || content.trim().length < 3}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Đang tạo..." : "Tạo tài liệu"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold">Import từ file Excel</div>
          <p className="mt-1 text-xs opacity-60">
            Hỗ trợ cột Tiêu đề/Nội dung hoặc Câu hỏi/Trả lời. Mỗi dòng sẽ tạo một tài liệu KB.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <input
            key={excelInputKey}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="file-input file-input-bordered w-full"
            onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={autoProcessImport}
              onChange={(event) => setAutoProcessImport(event.target.checked)}
            />
            Process sau khi import
          </label>
        </div>
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            disabled={importMutation.isPending || !excelFile}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Đang import..." : "Import Excel"}
          </button>
        </div>

        {importMutation.isError && (
          <div className="rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm text-error-content">
            Import thất bại: {importMutation.error?.response?.data?.error?.message || importMutation.error?.message || "Unknown error"}
          </div>
        )}

        {importResult && (
          <div className="rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-sm">
            Đã import {importResult.importedCount} tài liệu
            {autoProcessImport ? `, process thành công ${importResult.processedCount}` : ""}.
            {importResult.failedCount > 0 ? ` Lỗi process ${importResult.failedCount} tài liệu.` : ""}
            {importResult.skippedRows?.length ? ` Bỏ qua dòng: ${importResult.skippedRows.join(", ")}.` : ""}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 overflow-x-auto">
        {docsQ.isError && (
          <div className="mb-3 rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm text-error-content">
            Không tải được tài liệu KB: {docsQ.error?.response?.data?.error?.message || docsQ.error?.message || "Unknown error"}
          </div>
        )}
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Số chunks</th>
              <th className="text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {docsQ.isLoading ? (
              <tr>
                <td colSpan={4} className="text-center opacity-70">Đang tải...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center opacity-70">Chưa có tài liệu.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="max-w-xs truncate">{doc.title}</td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td>{doc?._count?.chunks ?? 0}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setSelectedDocumentId(doc.id);
                          setEditTitle(doc.title || "");
                          setEditContent(doc.content || "");
                          setIsEditingDocument(false);
                        }}
                      >
                        Chi tiết
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={processMutation.isPending}
                        onClick={() => processMutation.mutate({ id: doc.id })}
                      >
                        Process
                      </button>
                      <button
                        className="btn btn-sm btn-error btn-outline"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ id: doc.id })}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDocumentId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-base-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">Chi tiết tài liệu KB</h2>
                <p className="mt-1 text-sm opacity-60">
                  Xem nội dung gốc và các chunk chatbot dùng để truy xuất.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {selectedDocument && !detailQ.isLoading && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setIsEditingDocument((value) => !value)}
                    disabled={updateMutation.isPending}
                  >
                    {isEditingDocument ? "Hủy sửa" : "Sửa"}
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => setSelectedDocumentId(null)}>
                  Đóng
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              {detailQ.isLoading ? (
                <div className="py-10 text-center opacity-70">Đang tải chi tiết...</div>
              ) : detailQ.isError ? (
                <div className="rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm text-error-content">
                  Không tải được chi tiết: {detailQ.error?.response?.data?.error?.message || detailQ.error?.message || "Unknown error"}
                </div>
              ) : selectedDocument ? (
                <div className="space-y-5">
                  <div className="grid gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <div className="opacity-50">Tiêu đề</div>
                      <div className="break-words font-medium">{selectedDocument.title}</div>
                    </div>
                    <div>
                      <div className="opacity-50">Trạng thái</div>
                      <div className="mt-1"><StatusBadge status={selectedDocument.status} /></div>
                    </div>
                    <div>
                      <div className="opacity-50">Số chunks</div>
                      <div className="font-medium">{selectedDocument?._count?.chunks ?? selectedDocument.chunks?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="opacity-50">Cập nhật</div>
                      <div className="font-medium">{formatDate(selectedDocument.updatedAt)}</div>
                    </div>
                  </div>

                  {selectedDocument.error && (
                    <div className="rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm text-error-content">
                      {selectedDocument.error}
                    </div>
                  )}

                  {isEditingDocument ? (
                    <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <h3 className="text-sm font-semibold">Sửa tài liệu</h3>
                      <input
                        className="input input-bordered w-full bg-base-100"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        placeholder="Tiêu đề tài liệu"
                      />
                      <textarea
                        className="textarea textarea-bordered min-h-48 w-full bg-base-100"
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        placeholder="Nội dung tài liệu"
                      />
                      {updateMutation.isError && (
                        <div className="rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm text-error-content">
                          Không lưu được tài liệu: {updateMutation.error?.response?.data?.error?.message || updateMutation.error?.message || "Unknown error"}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setEditTitle(selectedDocument.title || "");
                            setEditContent(selectedDocument.content || "");
                            setIsEditingDocument(false);
                          }}
                          disabled={updateMutation.isPending}
                        >
                          Hủy
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => updateMutation.mutate()}
                          disabled={updateMutation.isPending || editTitle.trim().length < 3 || editContent.trim().length < 3}
                        >
                          {updateMutation.isPending ? "Đang lưu..." : "Lưu và process"}
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className="min-w-0">
                      <h3 className="mb-2 text-sm font-semibold">Nội dung gốc</h3>
                      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-base-200 bg-base-200/40 p-3 text-sm leading-6">{selectedDocument.content}</pre>
                    </section>
                  )}

                  <section className="min-w-0">
                    <h3 className="mb-2 text-sm font-semibold">Chunks đã xử lý</h3>
                    {!selectedDocument.chunks?.length ? (
                      <div className="rounded-xl border border-dashed border-base-300 p-4 text-center text-sm opacity-60">
                        Tài liệu này chưa có chunk. Bấm Process để xử lý lại.
                      </div>
                    ) : (
                      <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                        {selectedDocument.chunks.map((chunk, index) => (
                          <div key={chunk.id} className="rounded-xl border border-base-200 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs opacity-60">
                              <span>Chunk #{chunk.meta?.chunkIndex ?? index}</span>
                              <span>{formatDate(chunk.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">{chunk.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
