import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faKey,
  faMagnifyingGlass,
  faPenToSquare,
  faToggleOff,
  faToggleOn,
  faUserPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "../../utils/toast";
import {
  createAdminUser,
  listAdminUsers,
  toggleAdminUserStatus,
  updateAdminUser,
  updateDoctorPassword,
} from "../../services/admin.service";
import { confirmDialog } from "../../utils/confirm";
import { PASSWORD_REQUIREMENT_TEXT, validateStrongPassword } from "../../utils/password";

const ROLE_LABEL = { PATIENT: "Bệnh nhân", DOCTOR: "Bác sĩ", ADMIN: "Quản trị" };
const ROLE_BADGE = {
  PATIENT: "badge-info",
  DOCTOR: "badge-success",
  ADMIN: "badge-warning",
};

const EMPTY_FORM = { fullName: "", email: "", role: "DOCTOR", password: "" };
const EMPTY_PASSWORD_FORM = { password: "", confirmPassword: "" };

function Skeleton() {
  return <div className="h-10 w-full animate-pulse rounded bg-base-200" />;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [passwordUser, setPasswordUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await listAdminUsers({
        page,
        limit: 15,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setUsers(res.data ?? []);
      setMeta(res.meta ?? { total: 0, page: 1, totalPages: 1 });
    } catch {
      toast.error("Không tải được danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      setPage(1);
      load();
    }
  }

  async function handleToggle(user) {
    const action = user.isActive ? "vô hiệu hóa" : "kích hoạt";
    const ok = await confirmDialog(
      `${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản "${user.email}"?`
    );
    if (!ok) return;
    try {
      const res = await toggleAdminUserStatus(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success(`Đã ${action} tài khoản.`);
    } catch {
      toast.error("Thao tác thất bại");
    }
  }

  function startEdit(user) {
    setEditId(user.id);
    setEditForm({ fullName: user.fullName ?? "", role: user.role });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({});
  }

  async function saveEdit(userId) {
    try {
      const res = await updateAdminUser(userId, editForm);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
      setEditId(null);
      toast.success("Đã cập nhật.");
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Cập nhật thất bại");
    }
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setShowCreate(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (form.role === "PATIENT") {
      toast.error("Không được tạo tài khoản bệnh nhân từ trang quản trị.");
      return;
    }
    const passwordError = validateStrongPassword(form.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    try {
      setSaving(true);
      await createAdminUser(form);
      toast.success("Đã tạo tài khoản.");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setPage(1);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Tạo thất bại");
    } finally {
      setSaving(false);
    }
  }

  function openPasswordModal(user) {
    setPasswordUser(user);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordTouched(false);
  }

  function closePasswordModal() {
    setPasswordUser(null);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordTouched(false);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordTouched(true);
    const passwordError = validateStrongPassword(passwordForm.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      setPasswordSaving(true);
      const res = await updateDoctorPassword(passwordUser.id, passwordForm);
      setUsers((prev) => prev.map((u) => (u.id === passwordUser.id ? res.data : u)));
      toast.success("Đã đổi mật khẩu bác sĩ.");
      closePasswordModal();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Không thể đổi mật khẩu.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const passwordError =
    passwordTouched && passwordForm.password ? validateStrongPassword(passwordForm.password) : "";
  const confirmPasswordError =
    passwordTouched &&
    passwordForm.confirmPassword &&
    passwordForm.password !== passwordForm.confirmPassword
      ? "Mật khẩu xác nhận không khớp."
      : "";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-base-100 p-5 shadow sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Quản lý tài khoản</h1>
          <p className="mt-1 text-sm opacity-60">
            {meta.total} tài khoản • Trang {meta.page}/{meta.totalPages}
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={openCreateModal}>
          <FontAwesomeIcon icon={faUserPlus} /> Tạo tài khoản
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="input input-bordered flex flex-1 items-center gap-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input
            type="text"
            className="grow"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </label>
        <select
          className="select select-bordered w-40"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="PATIENT">Bệnh nhân</option>
          <option value="DOCTOR">Bác sĩ</option>
          <option value="ADMIN">Quản trị</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-base-100 shadow">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Xác minh</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th className="text-right">Động tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center opacity-50">
                  Không tìm thấy tài khoản nào
                </td>
              </tr>
            ) : (
              users.map((user) =>
                editId === user.id ? (
                  <tr key={user.id} className="bg-primary/5">
                    <td>
                      <input
                        className="input input-bordered input-sm w-full"
                        value={editForm.fullName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                        placeholder="Họ tên"
                      />
                    </td>
                    <td className="text-sm opacity-50">{user.email}</td>
                    <td>
                      <select
                        className="select select-bordered select-sm"
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      >
                        <option value="PATIENT">Bệnh nhân</option>
                        <option value="DOCTOR">Bác sĩ</option>
                        <option value="ADMIN">Quản trị</option>
                      </select>
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-sm btn-success gap-1" onClick={() => saveEdit(user.id)}>
                          <FontAwesomeIcon icon={faCheck} /> Lưu
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={user.id}>
                    <td className="font-medium">
                      {user.fullName || <span className="opacity-40">-</span>}
                    </td>
                    <td className="text-sm">{user.email}</td>
                    <td>
                      <span className={`badge badge-sm ${ROLE_BADGE[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-xs ${
                          user.emailVerifiedAt ? "badge-success" : "badge-ghost opacity-50"
                        }`}
                      >
                        Email {user.emailVerifiedAt ? "✓" : "✗"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-sm ${user.isActive ? "badge-success" : "badge-error"}`}>
                        {user.isActive ? "Hoạt động" : "Bị khóa"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm opacity-60">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-xs btn-ghost" title="Chỉnh sửa" onClick={() => startEdit(user)}>
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        {user.role === "DOCTOR" && (
                          <button
                            className="btn btn-xs btn-ghost text-info"
                            title="Đổi mật khẩu bác sĩ"
                            onClick={() => openPasswordModal(user)}
                          >
                            <FontAwesomeIcon icon={faKey} />
                          </button>
                        )}
                        <button
                          className={`btn btn-xs btn-ghost ${user.isActive ? "text-warning" : "text-success"}`}
                          title={user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                          onClick={() => handleToggle(user)}
                        >
                          <FontAwesomeIcon icon={user.isActive ? faToggleOff : faToggleOn} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Trước
          </button>
          <span className="btn btn-sm btn-disabled">
            {page} / {meta.totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau ›
          </button>
        </div>
      )}

      {showCreate && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-bold">Tạo tài khoản mới</h3>
            <p className="mt-1 text-sm opacity-60">Nhập thông tin cơ bản và phân quyền tài khoản.</p>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Họ tên</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email *</label>
                <input
                  required
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mật khẩu *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="input input-bordered w-full"
                  placeholder="Ví dụ: Clinic@123"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <p className="mt-1 text-xs opacity-60">{PASSWORD_REQUIREMENT_TEXT}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Vai trò *</label>
                <select
                  className="select select-bordered w-full"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="DOCTOR">Bác sĩ</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading loading-spinner loading-sm" /> : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
        </dialog>
      )}

      {passwordUser && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-bold">Đổi mật khẩu bác sĩ</h3>
            <p className="mt-1 text-sm opacity-60">
              {passwordUser.fullName || passwordUser.email} · {passwordUser.email}
            </p>
            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mật khẩu mới</label>
                <input
                  className={`input input-bordered w-full ${passwordError ? "input-error" : ""}`}
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                  onBlur={() => setPasswordTouched(true)}
                  autoComplete="new-password"
                  placeholder="Ví dụ: Clinic@123"
                />
                <p className="mt-1 text-xs opacity-60">{PASSWORD_REQUIREMENT_TEXT}</p>
                {passwordError && <p className="mt-1 text-xs text-error">{passwordError}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Xác nhận mật khẩu</label>
                <input
                  className={`input input-bordered w-full ${confirmPasswordError ? "input-error" : ""}`}
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                  onBlur={() => setPasswordTouched(true)}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                />
                {confirmPasswordError && (
                  <p className="mt-1 text-xs text-error">{confirmPasswordError}</p>
                )}
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closePasswordModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? <span className="loading loading-spinner loading-sm" /> : "Lưu mật khẩu"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closePasswordModal} />
        </dialog>
      )}
    </div>
  );
}
