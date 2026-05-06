import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "../../components/layout/DashboardLayout";
import NotificationBell from "../../components/layout/NotificationBell";
import { useBootAuth } from "../../context/useBootAuth";
import { createDoctorAppointmentEventSource } from "../../services/realtime.service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeHigh, faCalendarCheck, faCalendarDays, faUser } from "@fortawesome/free-solid-svg-icons";

export default function DoctorLayout() {
  const queryClient = useQueryClient();
  const { me } = useBootAuth();
  const [toast, setToast] = useState(null);
  const [isRealtimeDown, setIsRealtimeDown] = useState(false);
  // Notification mới nhất nhận qua SSE để truyền xuống NotificationBell
  const [latestNotification, setLatestNotification] = useState(null);

  const navItems = [
    { label: "Tổng quan",   to: "/dashboard/doctor",             end: true, icon: <FontAwesomeIcon icon={faGaugeHigh} /> },
    { label: "Lịch hẹn",     to: "/dashboard/doctor/appointments",        icon: <FontAwesomeIcon icon={faCalendarCheck} /> },
    { label: "Lịch làm việc", to: "/dashboard/doctor/schedule",            icon: <FontAwesomeIcon icon={faCalendarDays} /> },
    { label: "Hồ sơ",        to: "/dashboard/doctor/profile",             icon: <FontAwesomeIcon icon={faUser} /> },
  ];

  useEffect(() => {
    if (!me || me.role !== "DOCTOR") return undefined;

    let eventSource = null;
    let retryTimer = null;
    let stop = false;

    const showToast = (message) => {
      setToast({ id: Date.now(), message });
    };

    const connect = () => {
      if (stop) return;
      const es = createDoctorAppointmentEventSource();
      if (!es) return;

      eventSource = es;

      es.addEventListener("connected", () => {
        setIsRealtimeDown(false);
      });

      es.addEventListener("appointment_created", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const startAt = payload?.appointment?.slotStartAt;
          const startText = startAt
            ? new Date(startAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--";

          queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
          showToast(`Bạn có 1 lịch mới lúc ${startText}`);
        } catch {
          queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
          showToast("Bạn có 1 lịch mới");
        }
      });

      es.addEventListener("notification", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          if (payload?.notification) {
            setLatestNotification(payload.notification);
            // Hiển thị toast cho expiring và cancelled
            if (payload.notification.type === "APPOINTMENT_EXPIRING") {
              showToast(payload.notification.title);
            } else if (payload.notification.type === "APPOINTMENT_AUTO_CANCELLED") {
              showToast(payload.notification.title);
            }
            queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
          }
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        setIsRealtimeDown(true);
        es.close();
        if (!stop) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      stop = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) eventSource.close();
    };
  }, [me, queryClient]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const overlayContent = useMemo(
    () => (
      <>
        {isRealtimeDown && (
          <div className="fixed right-4 top-4 z-[2147483647] rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content shadow">
            Mất kết nối realtime, đang fallback refresh 30s.
          </div>
        )}
        {toast && (
          <div className="fixed bottom-4 right-4 z-[2147483647] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-success/30 bg-base-100 p-4 shadow-xl">
            <div className="text-sm font-semibold text-success">Lịch hẹn mới</div>
            <div className="mt-1 text-sm opacity-80">{toast.message}</div>
          </div>
        )}
      </>
    ),
    [isRealtimeDown, toast]
  );

  return <DashboardLayout
    navItems={navItems}
    title="Bác sĩ"
    overlayContent={overlayContent}
    headerExtra={<NotificationBell pushNotification={latestNotification} />}
  />;
}
