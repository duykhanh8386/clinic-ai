import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { confirmDialog } from "../../utils/confirm";
import {
  createDoctor,
  toggleDoctorStatus,
  updateDoctor,
  uploadDoctorAvatar,
  updateServiceDoctor,
} from "../../services/doctor.service";
import { listSpecialties } from "../../services/specialty.service";
import { validateStrongPassword, PASSWORD_REQUIREMENT_TEXT } from "../../utils/password";
import { CLINIC_SPECIALTIES } from "../../constants/specialties";

const PLACEHOLDER_AVATAR = "https://placehold.co/100x100?text=BS";

function doctorCode(id) { return id ? id.slice(-8).toUpperCase() : ""; }

const defaultForm = {
  email: "",
  password: "",
  fullName: "",
  phone: "",
  specialty: "",
  bio: "",
  serviceIds: [],
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^(?:\+84|0)(?:[35789]\d)\d{7}$/.test(phone.trim());
}

export default function AdminDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // List filters
  const [listSpecialtyFilter, setListSpecialtyFilter] = useState("");
  const [listServiceFilter, setListServiceFilter] = useState("");
  const [listSearch, setListSearch] = useState("");

  const specialtyOptions = useMemo(() => {
    const names = specialties.map((item) => item.name).filter(Boolean);
    return names.length ? names : CLINIC_SPECIALTIES;
  }, [specialties]);

  const displayedServiceOptions = useMemo(() => {
    if (!listSpecialtyFilter) return services;
    return services.filter((service) => (service.specialty || "").trim() === listSpecialtyFilter);
  }, [services, listSpecialtyFilter]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  // --- Create form state ---
  const [form, setForm] = useState(defaultForm);
  const [touched, setTouched] = useState({
    email: false, password: false, fullName: false, phone: false, specialty: false,
  });
  const [createAvatarFile, setCreateAvatarFile] = useState(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState(null);
  const createAvatarRef = useRef(null);

  // --- Edit modal state ---
  const [editDoctor, setEditDoctor] = useState(null); // doctor object being edited
  const [editForm, setEditForm] = useState({ fullName: "", specialty: "", bio: "" });
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const editAvatarRef = useRef(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  async function fetchDoctors() {
    try {
      const [docRes, svcRes, specialtyRes] = await Promise.all([
        api.get("/doctors", { params: { page: 1, limit: 50, includeInactive: true } }),
        api.get("/services", { params: { limit: 100 } }),
        listSpecialties({ page: 1, limit: 100 }),
      ]);
      setDoctors(docRes.data?.data || []);
      setServices(svcRes.data?.data?.services || svcRes.data?.data || []);
      setSpecialties(specialtyRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDoctors(); }, []);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!form.email.trim()) return "Email là bắt buộc.";
    if (!isValidEmail(form.email.trim())) return "Email không đúng định dạng.";
    return "";
  }, [form.email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    return validateStrongPassword(form.password);
  }, [form.password, touched.password]);

  const fullNameError = useMemo(() => {
    if (!touched.fullName) return "";
    if (!form.fullName.trim()) return "Họ tên là bắt buộc.";
    if (form.fullName.trim().length < 2) return "Họ tên phải có ít nhất 2 ký tự.";
    return "";
  }, [form.fullName, touched.fullName]);

  const phoneError = useMemo(() => {
    if (!touched.phone) return "";
    if (!form.phone.trim()) return "";
    if (!isValidPhone(form.phone)) return "Số điện thoại không hợp lệ (VD: 0912345678).";
    return "";
  }, [form.phone, touched.phone]);

  const specialtyError = useMemo(() => {
    if (!touched.specialty) return "";
    if (!form.specialty) return "Vui lòng chọn chuyên khoa.";
    return "";
  }, [form.specialty, touched.specialty]);

  const canSubmit =
    !emailError && !passwordError && !fullNameError && !phoneError && !specialtyError &&
    form.email.trim() && form.password && form.fullName.trim() && form.specialty;

  async function handleCreate(event) {
    event.preventDefault();
    setTouched({ email: true, password: true, fullName: true, phone: true, specialty: true });
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await createDoctor({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        specialty: form.specialty,
        bio: form.bio.trim() || null,
      });
      const newDoctorId = res?.data?.doctor?.id;
      if (newDoctorId && createAvatarFile) {
        await uploadDoctorAvatar(newDoctorId, createAvatarFile);
      }
      if (newDoctorId && form.serviceIds.length > 0) {
        await updateServiceDoctor(newDoctorId, { serviceIds: form.serviceIds });
      }
      setForm(defaultForm);
      setTouched({ email: false, password: false, fullName: false, phone: false, specialty: false });
      setCreateAvatarFile(null);
      setCreateAvatarPreview(null);
      setShowCreate(false);
      await fetchDoctors();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể tạo bác sĩ.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreateAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateAvatarFile(file);
    setCreateAvatarPreview(URL.createObjectURL(file));
  }

  function openEditModal(doctor) {
    setEditDoctor(doctor);
    setEditForm({
      fullName: doctor.fullName || "",
      specialty: doctor.specialty || "",
      bio: doctor.bio || "",
      serviceIds: (doctor.services || []).map((s) => s.id),
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setEditError("");
  }

  function closeEditModal() {
    setEditDoctor(null);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setEditError("");
  }

  function handleEditAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editDoctor) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await updateDoctor(editDoctor.id, {
        fullName: editForm.fullName.trim() || undefined,
        specialty: editForm.specialty || undefined,
        bio: editForm.bio.trim() || null,
      });
      if (editAvatarFile) {
        await uploadDoctorAvatar(editDoctor.id, editAvatarFile);
      }
      await updateServiceDoctor(editDoctor.id, { serviceIds: editForm.serviceIds });
      closeEditModal();
      await fetchDoctors();
    } catch (e) {
      setEditError(e?.response?.data?.error?.message || e?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleToggle(doctor) {
    const action = doctor.isActive !== false ? "tạm ngừng" : "kích hoạt";
    if (!await confirmDialog(`Bạn có chắc muốn ${action} tài khoản bác sĩ ${doctor.fullName}?`)) return;
    setSubmitting(true);
    setError("");
    try {
      await toggleDoctorStatus(doctor.id);
      await fetchDoctors();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Không thể cập nhật trạng thái.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Quản lý bác sĩ</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* List filters */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select select-bordered select-sm w-52"
            value={listSpecialtyFilter}
            onChange={(e) => {
              setListSpecialtyFilter(e.target.value);
              setListServiceFilter("");
            }}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialtyOptions.map((specialty) => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
          <select
            className="select select-bordered select-sm w-52"
            value={listServiceFilter}
            onChange={(e) => {
              const nextServiceId = e.target.value;
              const nextService = services.find((service) => service.id === nextServiceId);
              setListServiceFilter(nextServiceId);
              if (nextServiceId && nextService?.specialty) {
                setListSpecialtyFilter(nextService.specialty.trim());
              }
            }}
          >
            <option value="">Tất cả dịch vụ</option>
            {displayedServiceOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            className="input input-bordered input-sm flex-1 min-w-44"
            placeholder="Tìm tên, mã bác sĩ..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm ml-auto"
            onClick={() => setShowCreate(true)}
          >
            + Tạo bác sĩ
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-base-100 p-6 shadow-xl my-4">
        <form onSubmit={handleCreate}>
        <h2 className="text-lg font-semibold">Tạo bác sĩ mới</h2>
        <div className="mt-4 grid grid-cols-1 gap-4">

          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <img
              src={createAvatarPreview || PLACEHOLDER_AVATAR}
              alt="avatar preview"
              className="h-16 w-16 rounded-full object-cover border border-base-200"
            />
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => createAvatarRef.current?.click()}
              >
                Chọn ảnh đại diện
              </button>
              <input
                ref={createAvatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCreateAvatarChange}
              />
              <p className="mt-1 text-xs opacity-60">Không bắt buộc · Tối đa 5MB</p>
            </div>
          </div>

          <div>
            <input
              className={`input input-bordered w-full ${emailError ? "input-error" : ""}`}
              placeholder="Email"
              value={form.email}
              autoComplete="off"
              inputMode="email"
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            />
            {emailError && <p className="mt-1 text-xs text-error">{emailError}</p>}
          </div>

          <div>
            <input
              className={`input input-bordered w-full ${passwordError ? "input-error" : ""}`}
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            />
            {passwordError
              ? <p className="mt-1 text-xs text-error">{passwordError}</p>
              : <p className="mt-1 text-xs opacity-60">{PASSWORD_REQUIREMENT_TEXT}</p>}
          </div>

          <div>
            <input
              className={`input input-bordered w-full ${fullNameError ? "input-error" : ""}`}
              placeholder="Họ tên bác sĩ"
              value={form.fullName}
              onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            />
            {fullNameError && <p className="mt-1 text-xs text-error">{fullNameError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <input
                className={`input input-bordered w-full ${phoneError ? "input-error" : ""}`}
                placeholder="Số điện thoại (VD: 0912345678)"
                value={form.phone}
                inputMode="tel"
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              />
              {phoneError && <p className="mt-1 text-xs text-error">{phoneError}</p>}
            </div>

            <div>
              <select
                className={`select select-bordered w-full ${specialtyError ? "select-error" : ""}`}
                value={form.specialty}
                onChange={(e) => setForm((c) => ({ ...c, specialty: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, specialty: true }))}
              >
                <option value="">Chọn chuyên khoa</option>
                {specialtyOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {specialtyError && <p className="mt-1 text-xs text-error">{specialtyError}</p>}
            </div>
          </div>

          {form.specialty && services.filter((s) => !s.specialty || s.specialty === form.specialty).length > 0 && (
            <div>
              <label className="label label-text text-xs">Dịch vụ</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {services
                  .filter((s) => !s.specialty || s.specialty === form.specialty)
                  .map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-base-200 p-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={form.serviceIds.includes(s.id)}
                        onChange={() =>
                          setForm((c) => ({
                            ...c,
                            serviceIds: c.serviceIds.includes(s.id)
                              ? c.serviceIds.filter((x) => x !== s.id)
                              : [...c.serviceIds, s.id],
                          }))
                        }
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Bio (không bắt buộc)"
            value={form.bio}
            onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))}
          />
        </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                {submitting ? "Đang tạo..." : "Tạo bác sĩ"}
              </button>
            </div>
        </form>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách bác sĩ</h2>
          <span className="badge badge-outline">{doctors.length} bác sĩ</span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="mt-4 text-sm opacity-70">Chưa có bác sĩ nào.</div>
        ) : (() => {
            const filtered = doctors.filter((d) => {
              if (listSpecialtyFilter && (d.specialty || "").trim() !== listSpecialtyFilter) return false;
              if (listServiceFilter && !(d.services || []).some((s) => s.id === listServiceFilter)) return false;
              if (listSearch.trim()) {
                const q = listSearch.toLowerCase();
                return d.fullName.toLowerCase().includes(q) || doctorCode(d.id).toLowerCase().includes(q.replace("#",""));
              }
              return true;
            });
            return filtered.length === 0
              ? <div className="mt-4 text-sm opacity-70">Không tìm thấy bác sĩ nào.</div>
              : (
          <div className="mt-4 space-y-3">
            {filtered.map((doctor) => (
              <div key={doctor.id} className="rounded-2xl border border-base-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={doctor.avatarUrl || PLACEHOLDER_AVATAR}
                      alt={doctor.fullName}
                      className="h-12 w-12 rounded-full object-cover border border-base-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold">{doctor.fullName}</div>
                      <div className="text-xs opacity-50">#{doctorCode(doctor.id)} · {doctor.specialty}</div>
                    </div>
                  </div>
                  <span
                    className={`badge badge-sm shrink-0 ${
                      doctor.isActive !== false ? "badge-success" : "badge-error"
                    }`}
                  >
                    {doctor.isActive !== false ? "Hoạt động" : "Tạm ngừng"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(doctor.services || []).map((service) => (
                    <span key={service.id} className="badge badge-outline">{service.name}</span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-base-200 pt-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      navigate(`/dashboard/admin/slots?doctorId=${doctor.id}`)
                    }
                  >
                    Lịch làm việc / Sinh slot
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-info btn-outline"
                    onClick={() => openEditModal(doctor)}
                  >
                    Sửa hồ sơ
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${
                      doctor.isActive !== false
                        ? "btn-warning btn-outline"
                        : "btn-success btn-outline"
                    }`}
                    onClick={() => handleToggle(doctor)}
                    disabled={submitting}
                  >
                    {doctor.isActive !== false ? "Tạm ngừng" : "Kích hoạt"}
                  </button>

                </div>
              </div>
            ))}
          </div>
              );
          })()
        }
      </section>

      {/* Edit doctor modal */}
      {editDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-base-100 p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Sửa hồ sơ bác sĩ</h2>
<p className="mt-1 text-sm opacity-60">{editDoctor.fullName} · #{doctorCode(editDoctor.id)}</p>

            {editError && <div className="alert alert-error mt-3 text-sm">{editError}</div>}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <img
                  src={editAvatarPreview || editDoctor.avatarUrl || PLACEHOLDER_AVATAR}
                  alt="avatar"
                  className="h-16 w-16 rounded-full object-cover border border-base-200"
                />
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => editAvatarRef.current?.click()}
                  >
                    Đổi ảnh đại diện
                  </button>
                  <input
                    ref={editAvatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditAvatarChange}
                  />
                  <p className="mt-1 text-xs opacity-60">Tối đa 5MB</p>
                </div>
              </div>

              <div>
                <label className="label label-text text-xs">Họ tên</label>
                <input
                  className="input input-bordered w-full"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>

              <div>
                <label className="label label-text text-xs">Chuyên khoa</label>
                <select
                  className="select select-bordered w-full"
                  value={editForm.specialty}
                  onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))}
                >
                  <option value="">Chọn chuyên khoa</option>
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {editForm.specialty && services.filter((s) => !s.specialty || s.specialty === editForm.specialty).length > 0 && (
                <div>
                  <label className="label label-text text-xs">Dịch vụ</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {services
                      .filter((s) => !s.specialty || s.specialty === editForm.specialty)
                      .map((s) => (
                        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-base-200 p-3">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={editForm.serviceIds.includes(s.id)}
                            onChange={() =>
                              setEditForm((f) => ({
                                ...f,
                                serviceIds: f.serviceIds.includes(s.id)
                                  ? f.serviceIds.filter((x) => x !== s.id)
                                  : [...f.serviceIds, s.id],
                              }))
                            }
                          />
                          <span className="text-sm">{s.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label label-text text-xs">Bio</label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}





