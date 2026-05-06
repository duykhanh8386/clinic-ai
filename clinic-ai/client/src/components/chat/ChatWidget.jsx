import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createChatSession, getChatSession, sendChatMessage, sendGuestChatMessage } from "../../services/chat.service";
import ChatBubble, { TypingBubble } from "./ChatBubble";
import { useBootAuth } from "../../context/useBootAuth.jsx";

const CHAT_WIDGET_LAYOUT_KEY = "chat_widget_layout_v2";
const DEFAULT_PANEL_SIZE = { width: 430, height: 640 };
const MIN_PANEL_WIDTH = 360;
const MIN_PANEL_HEIGHT = 460;
const EDGE_GAP = 16;

function sessionKey(userId) {
  return `chat_session_${userId}`;
}

function getViewportBounds() {
  if (typeof window === "undefined") {
    return { width: DEFAULT_PANEL_SIZE.width, height: DEFAULT_PANEL_SIZE.height };
  }

  return {
    width: Math.max(MIN_PANEL_WIDTH, window.innerWidth),
    height: Math.max(MIN_PANEL_HEIGHT, window.innerHeight),
  };
}

function clampPanelSize(size) {
  const viewport = getViewportBounds();
  return {
    width: Math.min(Math.max(Math.round(size?.width || DEFAULT_PANEL_SIZE.width), MIN_PANEL_WIDTH), viewport.width - EDGE_GAP * 2),
    height: Math.min(Math.max(Math.round(size?.height || DEFAULT_PANEL_SIZE.height), MIN_PANEL_HEIGHT), viewport.height - EDGE_GAP * 2),
  };
}

function getDefaultPanelPosition(size = DEFAULT_PANEL_SIZE) {
  const viewport = getViewportBounds();
  return {
    x: Math.max(EDGE_GAP, viewport.width - size.width - EDGE_GAP),
    y: Math.max(EDGE_GAP, viewport.height - size.height - EDGE_GAP - 64),
  };
}

function clampPanelPosition(position, size) {
  const viewport = getViewportBounds();
  const clampedSize = clampPanelSize(size);
  return {
    x: Math.min(Math.max(Math.round(position?.x ?? getDefaultPanelPosition(clampedSize).x), EDGE_GAP), viewport.width - clampedSize.width - EDGE_GAP),
    y: Math.min(Math.max(Math.round(position?.y ?? getDefaultPanelPosition(clampedSize).y), EDGE_GAP), viewport.height - clampedSize.height - EDGE_GAP),
  };
}

function loadSavedLayout() {
  if (typeof window === "undefined") {
    return {
      size: DEFAULT_PANEL_SIZE,
      position: getDefaultPanelPosition(DEFAULT_PANEL_SIZE),
    };
  }

  try {
    const raw = localStorage.getItem(CHAT_WIDGET_LAYOUT_KEY);
    if (!raw) {
      const size = clampPanelSize(DEFAULT_PANEL_SIZE);
      return { size, position: clampPanelPosition(getDefaultPanelPosition(size), size) };
    }

    const parsed = JSON.parse(raw);
    const size = clampPanelSize(parsed?.size);
    const position = clampPanelPosition(parsed?.position, size);
    return { size, position };
  } catch {
    const size = clampPanelSize(DEFAULT_PANEL_SIZE);
    return { size, position: clampPanelPosition(getDefaultPanelPosition(size), size) };
  }
}

function logChatError(scope, error) {
  console.error(`[ChatWidget] ${scope}`, {
    message: error?.message,
    status: error?.response?.status,
    code: error?.response?.data?.error?.code,
    serverMessage: error?.response?.data?.error?.message,
    details: error?.response?.data?.error?.details,
    raw: error,
  });
}

function WindowControl({ title, onClick, disabled = false, children, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "hover:bg-red-50 hover:text-red-600"
      : tone === "accent"
        ? "hover:bg-slate-100 hover:text-slate-900"
        : "hover:bg-slate-100 hover:text-slate-900";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition ${toneClass} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export default function ChatWidget() {
  const { me, setMe } = useBootAuth();
  const savedLayout = loadSavedLayout();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState("");
  const [panelSize, setPanelSize] = useState(savedLayout.size);
  const [panelPosition, setPanelPosition] = useState(savedLayout.position);
  const [maximized, setMaximized] = useState(false);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const dragStateRef = useRef(null);
  const restoreLayoutRef = useRef(savedLayout);

  const hasToken = Boolean(me && localStorage.getItem("accessToken"));

  function clearSessionStorage() {
    if (me?.id) localStorage.removeItem(sessionKey(me.id));
  }

  function toUserErrorMessage(error, fallbackText) {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("me");
      clearSessionStorage();
      setMe(null);
      setSessionId("");
      setMessages([]);
      return "Phien dang nhap da het han. Vui long dang nhap lai.";
    }

    return error?.response?.data?.error?.message || error?.message || fallbackText;
  }

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [open, messages, loading]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;

    function onPointerMove(event) {
      if (!dragStateRef.current || maximized) return;

      const nextPosition = clampPanelPosition(
        {
          x: dragStateRef.current.startX + (event.clientX - dragStateRef.current.pointerX),
          y: dragStateRef.current.startY + (event.clientY - dragStateRef.current.pointerY),
        },
        panelSize
      );
      setPanelPosition(nextPosition);
    }

    function onPointerUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [open, maximized, panelSize]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function syncToViewport() {
      if (maximized) {
        const fullSize = {
          width: Math.max(MIN_PANEL_WIDTH, window.innerWidth - EDGE_GAP * 2),
          height: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - EDGE_GAP * 2),
        };
        setPanelSize(fullSize);
        setPanelPosition({ x: EDGE_GAP, y: EDGE_GAP });
        return;
      }

      setPanelSize((prev) => clampPanelSize(prev));
      setPanelPosition((prev) => clampPanelPosition(prev, panelSize));
    }

    window.addEventListener("resize", syncToViewport);
    return () => window.removeEventListener("resize", syncToViewport);
  }, [maximized, panelSize]);

  useEffect(() => {
    if (!open || !panelRef.current || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(([entry]) => {
      if (maximized) return;

      const nextSize = clampPanelSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });

      setPanelSize((prev) => {
        if (prev.width === nextSize.width && prev.height === nextSize.height) return prev;
        return nextSize;
      });
      setPanelPosition((prev) => clampPanelPosition(prev, nextSize));
    });

    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [open, maximized]);

  useEffect(() => {
    if (typeof window === "undefined" || maximized) return;
    localStorage.setItem(
      CHAT_WIDGET_LAYOUT_KEY,
      JSON.stringify({
        size: panelSize,
        position: panelPosition,
      })
    );
  }, [panelPosition, panelSize, maximized]);

  useEffect(() => {
    if (!me) {
      setSessionId("");
      setMessages([]);
    }
  }, [me]);

  async function ensureSession() {
    if (sessionId || !hasToken) return;

    try {
      setBooting(true);
      setError("");

      const savedId = me?.id ? localStorage.getItem(sessionKey(me.id)) : null;

      if (savedId) {
        try {
          const session = await getChatSession(savedId);
          setSessionId(savedId);
          setMessages(session?.data?.messages || []);
          return;
        } catch {
          localStorage.removeItem(sessionKey(me.id));
        }
      }

      const created = await createChatSession({});
      const newSessionId = created?.data?.id;

      if (!newSessionId) {
        throw new Error("Khong tao duoc session chat");
      }

      if (me?.id) localStorage.setItem(sessionKey(me.id), newSessionId);
      setSessionId(newSessionId);

      const session = await getChatSession(newSessionId);
      setMessages(session?.data?.messages || []);
    } catch (e) {
      logChatError("ensureSession", e);
      setError(toUserErrorMessage(e, "Khong khoi tao duoc chat"));
    } finally {
      setBooting(false);
    }
  }

  async function onNewChat() {
    if (!hasToken) {
      setMessages([]);
      setError("");
      return;
    }

    try {
      setBooting(true);
      setError("");
      clearSessionStorage();
      setSessionId("");
      setMessages([]);

      const created = await createChatSession({});
      const newSessionId = created?.data?.id;
      if (!newSessionId) throw new Error("Khong tao duoc session chat");

      if (me?.id) localStorage.setItem(sessionKey(me.id), newSessionId);
      setSessionId(newSessionId);
    } catch (e) {
      logChatError("onNewChat", e);
      setError(toUserErrorMessage(e, "Khong tao duoc cuoc hoi thoai moi"));
    } finally {
      setBooting(false);
    }
  }

  async function onOpenChat() {
    setOpen(true);
    if (maximized) {
      setPanelSize({
        width: Math.max(MIN_PANEL_WIDTH, window.innerWidth - EDGE_GAP * 2),
        height: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - EDGE_GAP * 2),
      });
      setPanelPosition({ x: EDGE_GAP, y: EDGE_GAP });
    } else {
      setPanelSize((prev) => clampPanelSize(prev));
      setPanelPosition((prev) => clampPanelPosition(prev, panelSize));
    }
    if (hasToken) {
      await ensureSession();
    }
  }

  function toggleMaximized() {
    if (maximized) {
      setMaximized(false);
      setPanelSize(clampPanelSize(restoreLayoutRef.current.size));
      setPanelPosition(clampPanelPosition(restoreLayoutRef.current.position, restoreLayoutRef.current.size));
      return;
    }

    restoreLayoutRef.current = {
      size: panelSize,
      position: panelPosition,
    };

    setMaximized(true);
    setPanelSize({
      width: Math.max(MIN_PANEL_WIDTH, window.innerWidth - EDGE_GAP * 2),
      height: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - EDGE_GAP * 2),
    });
    setPanelPosition({ x: EDGE_GAP, y: EDGE_GAP });
  }

  function onDragStart(event) {
    if (maximized) return;
    if (event.target.closest("button, a, input, textarea")) return;

    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: panelPosition.x,
      startY: panelPosition.y,
    };
  }

  async function onSend() {
    if (!input.trim() || loading) return;
    if (hasToken && !sessionId) return;

    const content = input.trim();
    setInput("");

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "USER", content, citations: [], createdAt: new Date().toISOString() },
    ]);
    setLoading(true);
    setError("");

    try {
      if (!hasToken) {
        const res = await sendGuestChatMessage({ content, topK: 5 });
        const userMessage = res?.data?.userMessage;
        const assistantMessage = res?.data?.assistantMessage;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          ...(userMessage ? [userMessage] : []),
          ...(assistantMessage ? [assistantMessage] : []),
        ]);
      } else {
        const res = await sendChatMessage(sessionId, { content, topK: 5 });
        const userMessage = res?.data?.userMessage;
        const assistantMessage = res?.data?.assistantMessage;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          ...(userMessage ? [userMessage] : []),
          ...(assistantMessage ? [assistantMessage] : []),
        ]);
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      logChatError("sendMessage", e);
      setError(toUserErrorMessage(e, "Khong gui duoc tin nhan"));
    } finally {
      setLoading(false);
    }
  }

  async function onRetry() {
    setError("");
    if (!hasToken) return;
    if (!sessionId) {
      await ensureSession();
      return;
    }

    try {
      setBooting(true);
      const session = await getChatSession(sessionId);
      setMessages(session?.data?.messages || []);
    } catch (e) {
      logChatError("retrySession", e);
      setError(toUserErrorMessage(e, "Khong tai lai duoc hoi thoai"));
    } finally {
      setBooting(false);
    }
  }

  const panelStyle = maximized
    ? {
        width: `${panelSize.width}px`,
        height: `${panelSize.height}px`,
        transform: `translate(${EDGE_GAP}px, ${EDGE_GAP}px)`,
      }
    : {
        width: `${panelSize.width}px`,
        height: `${panelSize.height}px`,
        transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)`,
      };

  return (
    <div className="fixed inset-0 z-[2147483600] pointer-events-none">
      {open ? (
        <div
          ref={panelRef}
          className={`pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.18)] ${
            maximized ? "" : "resize"
          }`}
          style={{
            ...panelStyle,
            maxWidth: `calc(100vw - ${EDGE_GAP * 2}px)`,
            maxHeight: `calc(100vh - ${EDGE_GAP * 2}px)`,
          }}
        >
          <div
            className="flex cursor-grab items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 active:cursor-grabbing"
            onPointerDown={onDragStart}
            onDoubleClick={toggleMaximized}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">AI Chat</div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!hasToken && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">Guest</span>
              )}
              <WindowControl title="New chat" onClick={onNewChat} disabled={booting || loading}>
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                  <path d="M10 4v12M4 10h12" />
                </svg>
              </WindowControl>
              <WindowControl title={maximized ? "Restore" : "Maximize"} onClick={toggleMaximized} disabled={booting} tone="accent">
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                  {maximized ? (
                    <>
                      <path d="M6 8.5h7.5V16H6z" />
                      <path d="M9 4h5v8" />
                    </>
                  ) : (
                    <path d="M4.5 4.5h11v11h-11z" />
                  )}
                </svg>
              </WindowControl>
              <WindowControl title="Close" onClick={() => setOpen(false)} tone="danger">
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </WindowControl>
            </div>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-auto bg-slate-50 px-3 py-3">
            {booting ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">Dang ket noi chat...</div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <div>{error}</div>
                <button className="btn btn-xs mt-3 border-none bg-red-500 text-white hover:bg-red-600" onClick={onRetry}>
                  Thu lai
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">Hay nhap cau hoi...</div>
                {!hasToken && (
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                    <Link className="link font-semibold text-blue-600" to="/login" onClick={() => setOpen(false)}>
                      Dang nhap
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {loading && <TypingBubble />}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  className="input input-sm h-9 w-full border-none bg-transparent px-0 text-slate-900 outline-none focus:outline-none"
                  placeholder="Nhap cau hoi..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSend();
                  }}
                  disabled={booting || loading || Boolean(error)}
                />
              </div>

              <button
                className="btn h-11 rounded-full border-none bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={onSend}
                disabled={!input.trim() || booting || loading || Boolean(error)}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto absolute bottom-4 right-4">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition hover:bg-blue-700"
            onClick={onOpenChat}
          >
            <svg viewBox="0 0 20 20" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5A2.5 2.5 0 0 1 13.5 13H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 10.5z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
