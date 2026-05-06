import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import ChatWidget from "../chat/ChatWidget";
import Toaster from "../ui/Toaster";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useBootAuth } from "../../context/useBootAuth";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../services/auth.service";
import { roleHomePath } from "../../utils/roleRedirect";
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { me, setMe } = useBootAuth();

  const mutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("me");
      setMe(null);
      navigate("/", { replace: true });
    },
  });

  const onLogout = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  useEffect(() => {
    AOS.init({ duration: 2000, once: true });
  }, []);

  // Ẩn navbar cũ trên trang chủ và toàn bộ dashboard (có sidebar riêng)
  // và các trang patient mới (dùng Header của Home)
  const isPublicPage =
    location.pathname === "/" ||
    location.pathname.startsWith("/booking") ||
    location.pathname.startsWith("/appointments") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/dashboard/services") ||
    location.pathname.startsWith("/dashboard/doctors") ||
    location.pathname.startsWith("/dashboard/doctor") ||
    location.pathname.startsWith("/dashboard/patient") ||
    location.pathname.startsWith("/dashboard/admin");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Chỉ hiện Navbar cũ nếu KHÔNG phải trang công khai (tức là đang ở Dashboard) */}
      {!isPublicPage && (
        <div className="navbar bg-base-100 shadow px-2 sm:px-4 gap-2 z-[101] relative">
          <div className="flex-none gap-2">
            {me ? (
              <>
                <span className="hidden sm:inline px-2 text-sm font-bold">
                  Hệ thống: {me.fullName} ({me.role})
                </span>
                <Link className="btn btn-sm btn-ghost" to={roleHomePath(me.role)}>
                  Dashboard
                </Link>
                <button className="btn btn-sm btn-error btn-outline" onClick={onLogout} disabled={mutation.isPending}>
                  {mutation.isPending ? "Đang thoát..." : "Đăng xuất"}
                </button>
                <Link className="btn btn-sm btn-primary" to="/">
                  Về trang chủ
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-sm" to="/login">Đăng nhập</Link>
                <Link className="btn btn-sm btn-primary" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      )}

      <main className="w-full">
        <Outlet />
      </main>
      <ChatWidget />
      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
