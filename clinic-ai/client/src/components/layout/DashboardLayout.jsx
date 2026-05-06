import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useBootAuth } from "../../context/useBootAuth";
import { logout } from "../../services/auth.service";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faHouse, faUser, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

/**
 * navItems: Array<{ label: string, to: string, icon?: string }>
 * title: string  — tên hệ thống hiển thị ở đầu sidebar
 */
export default function DashboardLayout({ navItems = [], title = "Clinic AI", overlayContent = null, headerExtra = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { me, setMe } = useBootAuth();

  const profilePath = me?.role === "DOCTOR" ? "/dashboard/doctor/profile" : null;
  const avatarFallback = (me?.fullName || me?.email || "?")[0].toUpperCase();

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("me");
      setMe(null);
      navigate("/", { replace: true });
    },
  });

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary text-primary-content"
        : "hover:bg-base-200 text-base-content"
    }`;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo / title */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-base-200 px-4">
        <Link to="/" className="flex items-center gap-2">
         
          <span className="text-base font-bold">{title}</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            {item.icon && <span className="w-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-60 shrink-0 flex-col bg-base-100 shadow-sm lg:flex">
        <SidebarContent />
      </aside>

      {/* ── Mobile: overlay drawer ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-base-100 shadow-lg transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top header (desktop + mobile) ── */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-base-200 bg-base-100 px-4 shadow-sm">
          {/* Mobile: hamburger + title */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <span className="font-semibold">{title}</span>
          </div>

          {/* Desktop: left placeholder */}
          <div className="hidden lg:block" />

          {/* Right: headerExtra + user avatar + dropdown */}
          <div className="flex items-center gap-2">
            {headerExtra}
            <div className="relative">
            <button
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-base-200"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              {(me?.doctorProfile?.avatarUrl || me?.avatarUrl) ? (
                <img
                  src={me.doctorProfile?.avatarUrl || me.avatarUrl}
                  alt="avatar"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-content text-sm font-bold">
                  {avatarFallback}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <div className="text-sm font-semibold leading-tight">{me?.fullName || me?.email}</div>
                <div className="text-xs opacity-50 capitalize">
                  {me?.role === "DOCTOR" ? "Bác sĩ" : me?.role === "ADMIN" ? "Admin" : me?.role?.toLowerCase()}
                </div>
              </div>
              <svg className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-base-200 bg-base-100 py-1 shadow-xl">
                  <div className="border-b border-base-200 px-4 py-3">
                    <div className="truncate text-sm font-semibold">{me?.fullName || me?.email}</div>
                    <div className="truncate text-xs opacity-50">{me?.email}</div>
                  </div>
                  <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-base-200"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faHouse} className="w-4" /> Trang chủ
                  </Link>
                  {profilePath && (
                    <Link
                      to={profilePath}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-base-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={faUser} className="w-4" /> Hồ sơ
                    </Link>
                  )}
                  <div className="my-1 border-t border-base-200" />
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error transition-colors hover:bg-base-200"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logoutMutation.mutate();
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="w-4" /> {logoutMutation.isPending ? "Đang thoát..." : "Đăng xuất"}
                  </button>
                </div>
</>
            )}
            </div>{/* end user dropdown */}
          </div>{/* end flex items-center gap-2 */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {overlayContent}
    </div>
  );
}
