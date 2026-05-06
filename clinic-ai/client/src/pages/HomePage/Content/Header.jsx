import Logo from "../../../assets/Header/Logo.png";
import Phone from "../../../assets/Header/Phone.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faX, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBootAuth } from "../../../context/useBootAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../../../services/auth.service";
import { roleHomePath } from "../../../utils/roleRedirect";
import NotificationBell from "../../../components/layout/NotificationBell";
import { createPatientAppointmentEventSource } from "../../../services/realtime.service";
import { toast } from "../../../utils/toast";

function Header() {
  const navigate = useNavigate();
  const { me, setMe } = useBootAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const sseRef = useRef(null);
  const lastToastedIdRef = useRef(null);

  // SSE for patient notifications
  useEffect(() => {
    if (me?.role !== "PATIENT") return;
    let stop = false;
    let retryTimer = null;

    const connect = () => {
      if (stop) return;
      const es = createPatientAppointmentEventSource();
      if (!es) return;
      sseRef.current = es;

      es.addEventListener("appointment_status_updated", () => {
        queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      });

      es.addEventListener("notification", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          if (payload?.notification) {
            setLatestNotification(payload.notification);
            queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
            // Dedup: chỉ hiện toast 1 lần cho mỗi notification (tránh double-fire do StrictMode)
            if (
              payload.notification.id !== lastToastedIdRef.current &&
              payload.notification.type !== "APPOINTMENT_NEW"
            ) {
              lastToastedIdRef.current = payload.notification.id;
              toast.info(payload.notification.message || "Bạn có 1 thông báo mới từ bác sĩ");
            }
          }
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        es.close();
        if (!stop) retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      stop = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (sseRef.current) sseRef.current.close();
    };
  }, [me, queryClient]);

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
    closeMenu();
  };

  const isStaff = me?.role === "DOCTOR" || me?.role === "ADMIN";

  const dataMenu = [
    { id: 1, menu: "Giới thiệu", url: "/" },
    { id: 2, menu: "Dịch vụ", url: "/dashboard/services" },
    { id: 5, menu: "Đội ngũ bác sĩ", url: "/dashboard/doctors" },
    // "Đặt lịch" chỉ hiển thị cho patient hoặc khách chưa đăng nhập
    ...(!isStaff ? [{ id: 10, menu: "Đặt lịch", url: me?.role === "PATIENT" ? "/booking" : "/booking" }] : []),
    ...(me?.role === "PATIENT" ? [
      { id: 11, menu: "Hồ sơ", url: "/profile" },
    ] : []),
  ];

  const openMenu = () => {
    setIsOpen(true);
    setTimeout(() => setIsAnimating(true));
  }
  const closeMenu = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 100);
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className={`w-full sticky top-0 left-0 right-0 z-100 h-20 flex items-center transition-all duration-300 ${isScrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
        <div className="flex items-center 4k:max-w-[75%] sm:max-w-[80%] max-w-[95%] lg1:mx-auto w-full mx-auto lg1:justify-around justify-between">
          
          {/* Logo */}
          <div className="lg:basis-[15%] sm:basis-[30%] basis-[50%]">
            <Link to="/"><img src={Logo} alt="Logo" className="w-[80%]" /></Link>
          </div>

          {/* Desktop Menu */}
          <div className="basis-[85%] lg1:flex hidden justify-between items-center lg:text-[12px] lg1:text-[13px] xl:text-[14px] 2xl:text-[16px] 4k:text-[18px]">
            <div className="flex gap-6 items-center">
              {dataMenu.map((item) => (
                <div key={item.id} className="font-bold hover:text-green-500 transition-all flex items-center relative group">
                  <Link to={item.url}>{item.menu}
                    <span className="block w-4 h-0.75 absolute group-hover:bg-green-500 opacity-0 group-hover:opacity-100 rounded-md mt-2 left-1/2 translate-x-[-50%]"></span>
                  </Link>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {/* Auth Part */}
              <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
                {me ? (
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700 hidden xl:inline">Chào, {me?.fullName?.split(' ')?.pop() || "bạn"}!</span>
                    {me.role !== "PATIENT" && (
                      <Link to={roleHomePath(me.role)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold hover:bg-blue-100 transition-all">Dashboard</Link>
                    )}
                    {me.role === "PATIENT" && (
                      <NotificationBell pushNotification={latestNotification} />
                    )}
                    <button onClick={onLogout} className="text-gray-500 hover:text-red-500 font-bold">Thoát</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/login" className="font-bold text-gray-700 hover:text-green-600">Đăng nhập</Link>
                    <Link to="/register" className="px-4 py-2 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-all">Đăng ký</Link>
                  </div>
                )}
              </div>

              {/* Phone Button */}
              <a href="tel:19001806">
                <div className="bg_button flex gap-3 font-bold! items-center justify-between px-4 py-2 shadow-sm">
                  <div className="bg-white p-2 rounded-full"><img src={Phone} alt="Phone" className="w-4 h-4" /></div>
                  1900 1806
                </div>
              </a>
            </div>
          </div>

          {/* Mobile Menu Icon */}
          <div className="lg1:hidden mr-4 flex relative text-xl cursor-pointer" onClick={openMenu}>
            <FontAwesomeIcon icon={faBars} />
          </div>

          {/* Mobile Sidebar */}
          {isOpen && (
            <div className="fixed inset-0 z-1000">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMenu} />
              <div className={`absolute top-0 right-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out w-4/5 ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b">
                  <img src={Logo} alt="Logo" className="h-10" />
                  <button onClick={closeMenu} className="text-xl text-gray-600"><FontAwesomeIcon icon={faX} /></button>
                </div>

                <div className="px-4 pt-4 flex flex-col h-[calc(100%-80px)]">
                  {/* Auth Mobile */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    {me ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 font-bold text-gray-800">
                          <FontAwesomeIcon icon={faUserCircle} className="text-2xl text-green-500" />
                          {me.fullName}
                        </div>
                        {me.role !== "PATIENT" && (
                          <Link to={roleHomePath(me.role)} onClick={closeMenu} className="block w-full text-center py-2 bg-green-500 text-white rounded-lg font-bold">Dashboard</Link>
                        )}
                        <button onClick={onLogout} className="w-full text-center py-2 border border-red-200 text-red-500 rounded-lg font-bold">Thoát</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Link to="/login" onClick={closeMenu} className="py-2 text-center border border-gray-300 rounded-lg font-bold">Đăng nhập</Link>
                        <Link to="/register" onClick={closeMenu} className="py-2 text-center bg-green-500 text-white rounded-lg font-bold">Đăng ký</Link>
                      </div>
                    )}
                  </div>

                  {/* Menu Links Mobile */}
                  <div className="space-y-1">
                    {dataMenu.map(item => (
                      <Link key={item.id} to={item.url} onClick={closeMenu} className="block py-3 px-4 border-b border-gray-50 text-gray-800 font-medium hover:bg-green-50">
                        {item.menu}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-auto pb-8">
                     <a href="tel:19001806" className="flex items-center justify-center gap-3 w-full bg_button py-4 text-white font-bold">
                        <img src={Phone} alt="Phone" className="w-5" /> 1900 1806
                     </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
export default Header;