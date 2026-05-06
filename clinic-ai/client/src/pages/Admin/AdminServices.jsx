import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { deleteService, postService, putService } from "../../services/service.service";
import { listSpecialties } from "../../services/specialty.service";
import { confirmDialog } from "../../utils/confirm";
import { formatCurrency } from "../../utils/booking";
import { CLINIC_SPECIALTIES } from "../../constants/specialties";

const defaultForm = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  specialty: "",
};

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  async function fetchServices() {
    try {
      const [res, specialtyRes] = await Promise.all([
        api.get("/services", { params: { page: 1, limit: 50 } }),
        listSpecialties({ page: 1, limit: 100 }),
      ]);
      setServices(res.data?.data || []);
      setSpecialties(specialtyRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không tải được dịch vụ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchServices(); }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        specialty: form.specialty || undefined,
      };
      if (editingId) {
        await putService(editingId, payload);
      } else {
        await postService(payload);
      }
      setForm(defaultForm);
      setEditingId("");
      setShowCreate(false);
      await fetchServices();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể lưu dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      durationMinutes: String(service.durationMinutes ?? ""),
      specialty: service.specialty || "",
    });
  }

  async function handleDelete(id) {
    if (!await confirmDialog("Bạn có chắc muốn xóa dịch vụ này?", { danger: true })) return;
    setSubmitting(true);
    setError("");
    try {
      await deleteService(id);
      await fetchServices();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể xóa dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  }

  const specialtyOptions = useMemo(() => {
    const names = specialties.map((item) => item.name).filter(Boolean);
    return names.length ? names : CLINIC_SPECIALTIES;
  }, [specialties]);

  const filteredServices = useMemo(() => {
    let list = services;
    if (specialtyFilter) {
      list = list.filter((service) => (service.specialty || "").trim() === specialtyFilter);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(
        (service) =>
          (service.name || "").toLowerCase().includes(q) ||
          (service.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, specialtyFilter, searchFilter]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Quản lý dịch vụ</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-base-100 p-6 shadow-xl my-4">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold">Tạo dịch vụ mới</h2>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <input
                  className="input input-bordered w-full"
                  placeholder="Tên dịch vụ"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Mô tả"
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    placeholder="Giá"
                    value={form.price}
                    onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                    required
                  />
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    placeholder="Thời lượng (phút)"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))}
                    required
                  />
                </div>
                <select
                  className="select select-bordered w-full"
                  value={form.specialty}
                  onChange={(e) => setForm((c) => ({ ...c, specialty: e.target.value }))}
                  required
                >
                  <option value="">Chọn chuyên khoa</option>
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setShowCreate(false); setForm(defaultForm); }}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                  {submitting ? "Đang tạo..." : "Tạo dịch vụ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-base-100 p-6 shadow-xl my-4">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold">Cập nhật dịch vụ</h2>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <input
                  className="input input-bordered w-full"
                  placeholder="Tên dịch vụ"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Mô tả"
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    placeholder="Giá"
                    value={form.price}
                    onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                    required
                  />
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    placeholder="Thời lượng (phút)"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))}
                    required
                  />
                </div>
                <select
                  className="select select-bordered w-full"
                  value={form.specialty}
                  onChange={(e) => setForm((c) => ({ ...c, specialty: e.target.value }))}
                  required
                >
                  <option value="">Chọn chuyên khoa</option>
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEditingId(""); setForm(defaultForm); }}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách dịch vụ</h2>
          <div className="flex items-center gap-2">
            <span className="badge badge-outline">{filteredServices.length} dịch vụ</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            >
              + Tạo dịch vụ
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm w-52"
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialtyOptions.map((specialty) => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
          <input
            className="input input-bordered input-sm flex-1 min-w-52"
            placeholder="Tìm tên / mô tả dịch vụ..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="mt-4 text-sm opacity-70">Chưa có dịch vụ nào.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {filteredServices.map((service) => (
              <div key={service.id} className="rounded-2xl border border-base-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="mt-1 text-sm opacity-70">
                      {service.description || "Chưa có mô tả"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <div className="font-medium">{formatCurrency(service.price)}</div>
                    <div className="opacity-70">{service.durationMinutes} phút</div>
                    {service.specialty && (
                      <div className="mt-1">
                        <span className="badge badge-outline badge-sm">{service.specialty}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn btn-sm btn-outline" onClick={() => startEdit(service)}>
                    Sửa
                  </button>
                  <button
                    className="btn btn-sm btn-error btn-outline"
                    onClick={() => handleDelete(service.id)}
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




