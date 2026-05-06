import { useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { roleHomePath } from "../../utils/roleRedirect";

export default function RequireRole({ roles }) {
  const raw = localStorage.getItem("me");
  const token = localStorage.getItem("accessToken");
  const location = useLocation();
  const navigate = useNavigate();
  const [declined, setDeclined] = useState(false);

  // If user declined the prompt, go back (render nothing — parent route stays)
  if (declined) return null;

  // Not logged in → show dialog instead of instant redirect
  if (!token || !raw) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-base font-semibold">Yêu cầu đăng nhập</h3>
            <p className="text-sm text-base-content/60">
              Bạn sẽ cần phải đăng nhập để có thể truy cập vào trang này.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm flex-1"
              onClick={() => {
                setDeclined(true);
                navigate(-1);
              }}
            >
              Để sau
            </button>
            <button
              className="btn btn-primary btn-sm flex-1"
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
              }
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  let me = null;
  try {
    me = JSON.parse(raw);
  } catch {
    localStorage.removeItem("me");
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(me.role)) {
    return <Navigate to={roleHomePath(me.role)} replace />;
  }

  return <Outlet />;
}
