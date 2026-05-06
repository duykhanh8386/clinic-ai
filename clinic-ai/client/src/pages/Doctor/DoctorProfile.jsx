import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "../../services/auth.service";
import { useBootAuth } from "../../context/useBootAuth";
import { getDoctor, updateDoctor, uploadDoctorAvatar } from "../../services/doctor.service";
import { listSpecialties } from "../../services/specialty.service";
import { CLINIC_SPECIALTIES } from "../../constants/specialties";

const PLACEHOLDER_AVATAR = "https://placehold.co/120x120?text=BS";

export default function DoctorProfile() {
  const queryClient = useQueryClient();
  const { setMe } = useBootAuth();
  const meQ = useQuery({ queryKey: ["doctor-me"], queryFn: () => getMe() });
  const me = meQ.data?.data;
  const doctorProfileId = me?.doctorProfile?.id;

  const doctorProfileQ = useQuery({
    queryKey: ["doctor-profile-by-user", doctorProfileId],
    enabled: Boolean(doctorProfileId),
    queryFn: () => getDoctor(doctorProfileId),
  });

  const specialtiesQ = useQuery({
    queryKey: ["doctor-profile-specialties"],
    queryFn: () => listSpecialties({ page: 1, limit: 100 }),
  });

  const doctorProfile = doctorProfileQ.data?.data;
  const specialtyOptions = useMemo(() => {
    const names = (specialtiesQ.data?.data || []).map((item) => item.name).filter(Boolean);
    return names.length ? names : CLINIC_SPECIALTIES;
  }, [specialtiesQ.data]);

  // --- Avatar upload ---
  const avatarRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !doctorProfileId) return;
    setAvatarUploading(true);
    setAvatarError("");
    try {
      await uploadDoctorAvatar(doctorProfileId, avatarFile);
      setAvatarFile(null);
      setAvatarPreview(null);
      queryClient.invalidateQueries({ queryKey: ["doctor-profile-by-user", doctorProfileId] });
      // Refresh AuthContext so the header avatar updates immediately
      const fresh = await getMe();
      setMe(fresh.data);
    } catch (e) {
      setAvatarError(e?.response?.data?.error?.message || e?.message || "Upload thất bại.");
    } finally {
      setAvatarUploading(false);
    }
  }

  // --- Edit profile ---
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", specialty: "", phone: "", bio: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit() {
    setEditForm({
      fullName: doctorProfile?.fullName || "",
      specialty: doctorProfile?.specialty || "",
      phone: doctorProfile?.phone || "",
      bio: doctorProfile?.bio || "",
    });
    setEditing(true);
    setEditError("");
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!doctorProfileId) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await updateDoctor(doctorProfileId, {
        fullName: editForm.fullName.trim() || undefined,
        specialty: editForm.specialty || undefined,
        phone: editForm.phone.trim() || null,
        bio: editForm.bio.trim() || null,
      });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["doctor-profile-by-user", doctorProfileId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-me"] });
    } catch (e) {
      setEditError(e?.response?.data?.error?.message || e?.message || "Cập nhật thất bại.");
    } finally {
      setEditSubmitting(false);
    }
  }

  if (meQ.isLoading || doctorProfileQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        <div className="h-48 animate-pulse rounded-3xl bg-base-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Hồ sơ bác sĩ</h1>
      </div>

      {/* Avatar card */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Ảnh đại diện</h2>
        <div className="flex items-center gap-6">
          <img
            src={avatarPreview || doctorProfile?.avatarUrl || PLACEHOLDER_AVATAR}
            alt="avatar"
            className="h-24 w-24 rounded-full object-cover border-2 border-base-200"
          />
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => avatarRef.current?.click()}
            >
              Chọn ảnh mới
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarFile && (
              <button
                type="button"
                className="btn btn-sm btn-primary ml-2"
                onClick={handleAvatarUpload}
                disabled={avatarUploading}
              >
                {avatarUploading ? "Đang upload..." : "Lưu ảnh"}
              </button>
            )}
            {avatarError && <p className="text-xs text-error">{avatarError}</p>}
            <p className="text-xs opacity-60">Tối đa 5MB · JPG, PNG, WEBP</p>
          </div>
        </div>
      </div>

      {/* Profile info card */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Thông tin cá nhân</h2>
          {!editing && (
            <button type="button" className="btn btn-sm btn-outline" onClick={openEdit}>
              ✏️ Chỉnh sửa
            </button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Email</div>
              <div className="mt-1 text-sm">{me?.email || "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Họ tên</div>
              <div className="mt-1 text-sm">{doctorProfile?.fullName || "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Chuyên khoa</div>
              <div className="mt-1 text-sm">{doctorProfile?.specialty || "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Số điện thoại</div>
              <div className="mt-1 text-sm">{doctorProfile?.phone || me?.phone || "-"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Bio</div>
              <div className="mt-1 text-sm">{doctorProfile?.bio || "Chưa cập nhật"}</div>
            </div>
            <div>
              <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Dịch vụ được gán</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(doctorProfile?.services || []).length === 0 ? (
                  <span className="text-sm opacity-60">Chưa có</span>
                ) : (
                  doctorProfile.services.map((s) => (
                    <span key={s.id} className="badge badge-outline">{s.name}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && <div className="alert alert-error text-sm">{editError}</div>}

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
            <div>
              <label className="label label-text text-xs">Số điện thoại</label>
              <input
                className="input input-bordered w-full"
                value={editForm.phone}
                inputMode="tel"
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label label-text text-xs">Bio</label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(false)}
                disabled={editSubmitting}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={editSubmitting}>
                {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
