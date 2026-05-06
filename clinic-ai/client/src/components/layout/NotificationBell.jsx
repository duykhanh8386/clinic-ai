import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell, faCalendarXmark, faCalendarCheck, faTriangleExclamation, faCheckDouble,
  faCalendarDay, faRotate, faCircleCheck, faClock,
} from "@fortawesome/free-solid-svg-icons";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/notification.service";

// ── Hằng số ───────────────────────────────────────────────────────────────────
const TYPE_META = {
  APPOINTMENT_NEW: {
    icon: faCalendarCheck,
    color: "text-success",
    bg: "bg-success/10",
  },
  APPOINTMENT_CONFIRMED: {
    icon: faCircleCheck,
    color: "text-success",
    bg: "bg-success/10",
  },
  APPOINTMENT_CANCELLED: {
    icon: faCalendarXmark,
    color: "text-error",
    bg: "bg-error/10",
  },
  APPOINTMENT_DONE: {
    icon: faCalendarDay,
    color: "text-info",
    bg: "bg-info/10",
  },
  APPOINTMENT_RESCHEDULED: {
    icon: faRotate,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  APPOINTMENT_EXPIRING: {
    icon: faTriangleExclamation,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  APPOINTMENT_AUTO_CANCELLED: {
    icon: faCalendarXmark,
    color: "text-error",
    bg: "bg-error/10",
  },
  SLOTS_GENERATED: {
    icon: faClock,
    color: "text-primary",
    bg: "bg-primary/10",
  },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function buildNotificationLink(notification) {
  let link = notification?.link || "";
  const appointmentId = notification?.appointmentId;
  if (!link || !appointmentId) return link;

  const hasIdParam = /[?&]id=/.test(link);
  if (!hasIdParam && link.startsWith("/dashboard/doctor/appointments")) {
    link += `${link.includes("?") ? "&" : "?"}id=${encodeURIComponent(appointmentId)}`;
  } else if (!hasIdParam && link.startsWith("/appointments")) {
    link += `${link.includes("?") ? "&" : "?"}id=${encodeURIComponent(appointmentId)}`;
  }

  return link;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationBell({ pushNotification = null }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const knownNotificationIdsRef = useRef(new Set());
  const navigate = useNavigate();

  // Tải danh sách
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listNotifications();
      const items = res.data ?? [];
      knownNotificationIdsRef.current = new Set(items.map((item) => item.id));
      setNotifications(items);
      setUnread(res.meta?.unreadCount ?? 0);
    } catch {
      // ignore errors silently
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải lần đầu + poll mỗi 30 giây
  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 30_000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  // Nhận notification từ SSE (truyền vào từ DoctorLayout)
  useEffect(() => {
    if (!pushNotification?.id) return;
    if (knownNotificationIdsRef.current.has(pushNotification.id)) return;

    knownNotificationIdsRef.current.add(pushNotification.id);
    setNotifications((prev) => {
      const exists = prev.find((n) => n.id === pushNotification.id);
      if (exists) return prev;
      return [pushNotification, ...prev];
    });
    if (!pushNotification.isRead) {
      setUnread((c) => c + 1);
    }
  }, [pushNotification]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Click vào một thông báo → optimistic mark-read, rồi sync server ngầm
  async function handleClick(notification) {
    if (!notification.isRead) {
      // Optimistic: cập nhật UI ngay lập tức
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnread((c) => Math.max(0, c - 1));
      // Sync lên server ngầm (không block UX)
      markNotificationRead(notification.id).catch(() => {
        // Nếu server lỗi, vẫn giữ trạng thái optimistic đã đọc cho UX tốt
      });
    }
    setOpen(false);
    const target = buildNotificationLink(notification);
    if (target) navigate(target);
  }

  // Đánh dấu tất cả đã đọc → optimistic
  async function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    markAllNotificationsRead().catch(() => {
      // Reload để sync lại nếu server lỗi
      loadNotifications();
    });
  }

  const meta = (type) => TYPE_META[type] ?? TYPE_META.APPOINTMENT_NEW;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-base-200"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
      >
        <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-0.5 text-[10px] font-bold text-error-content">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-[2147483630] mt-2 w-80 rounded-2xl border border-base-200 bg-base-100 shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
            <span className="font-semibold text-sm">Thông báo</span>
            {unread > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={handleMarkAll}
              >
                <FontAwesomeIcon icon={faCheckDouble} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm opacity-50">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((n) => {
                const m = meta(n.type);
                return (
                  <button
                    key={n.id}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-base-200 ${
                      n.isRead ? "opacity-60" : ""
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    {/* Icon */}
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.bg}`}>
                      <FontAwesomeIcon icon={m.icon} className={`h-3.5 w-3.5 ${m.color}`} />
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {!n.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs opacity-70">{n.message}</p>
                      <p className="mt-1 text-[11px] opacity-40">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
