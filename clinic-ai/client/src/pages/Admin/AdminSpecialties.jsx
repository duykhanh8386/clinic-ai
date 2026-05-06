import { useEffect, useMemo, useState } from "react";
import {
  deleteSpecialty,
  listSpecialties,
  postSpecialty,
  putSpecialty,
} from "../../services/specialty.service";
import { confirmDialog } from "../../utils/confirm";

const defaultForm = {
  name: "",
  description: "",
};

export default function AdminSpecialties() {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchSpecialties() {
    try {
      const res = await listSpecialties({ page: 1, limit: 100 });
      setSpecialties(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không tải được chuyên khoa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const filteredSpecialties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return specialties;
    return specialties.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
    );
  }, [search, specialties]);

  function resetForm() {
    setForm(defaultForm);
    setEditingId("");
    setShowCreate(false);
  }

  function startEdit(specialty) {
    setEditingId(specialty.id);
    setForm({
      name: specialty.name || "",
      description: specialty.description || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };
      if (editingId) {
        await putSpecialty(editingId, payload);
      } else {
        await postSpecialty(payload);
      }
      resetForm();
      await fetchSpecialties();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể lưu chuyên khoa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(specialty) {
    const ok = await confirmDialog(`Bạn có chắc muốn xóa chuyên khoa "${specialty.name}"?`, {
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    setError("");
    try {
      await deleteSpecialty(specialty.id);
      await fetchSpecialties();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể xóa chuyên khoa.");
    } finally {
      setSubmitting(false);
    }
  }

  const showFormModal = showCreate || editingId;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Quản lý chuyên khoa</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-base-100 p-6 shadow-xl">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold">
                {editingId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa mới"}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <input
                  className="input input-bordered w-full"
                  placeholder="Tên chuyên khoa"
                  value={form.name}
                  onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))}
                  required
                />
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Mô tả"
                  value={form.description}
                  onChange={(e) =>
                    setForm((cur) => ({ ...cur, description: e.target.value }))
                  }
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                  {submitting ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách chuyên khoa</h2>
          <div className="flex items-center gap-2">
            <span className="badge badge-outline">{filteredSpecialties.length} chuyên khoa</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setForm(defaultForm);
                setShowCreate(true);
              }}
            >
              + Tạo chuyên khoa
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            className="input input-bordered input-sm w-full"
            placeholder="Tìm tên / mô tả chuyên khoa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="mt-4 text-sm opacity-70">Chưa có chuyên khoa nào.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {filteredSpecialties.map((specialty) => (
              <div key={specialty.id} className="rounded-2xl border border-base-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{specialty.name}</div>
                    <div className="mt-1 text-sm opacity-70">
                      {specialty.description || "Chưa có mô tả"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs opacity-70">
                    <div>{specialty.doctorsCount ?? 0} bác sĩ</div>
                    <div>{specialty.servicesCount ?? 0} dịch vụ</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn btn-sm btn-outline" onClick={() => startEdit(specialty)}>
                    Sửa
                  </button>
                  <button
                    className="btn btn-sm btn-error btn-outline"
                    onClick={() => handleDelete(specialty)}
                    disabled={submitting}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
