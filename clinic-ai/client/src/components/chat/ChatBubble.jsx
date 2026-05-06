function fmtTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm">
        <div className="flex h-5 items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:140ms]" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:280ms]" />
        </div>
      </div>
    </div>
  );
}

export default function ChatBubble({ message }) {
  const isUser = message.role === "USER";
  const generationProvider = message?.toolArgs?.generationProvider;
  const fallbackFrom = message?.toolArgs?.fallbackFrom;
  const fallbackReason = message?.toolArgs?.fallbackReason;
  const showCitations = message?.toolArgs?.showCitations === true;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-white text-slate-800"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>

        {!isUser && generationProvider === "template" && fallbackFrom && (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <div>Fallback tu {fallbackFrom} sang template.</div>
            {fallbackReason && <div className="mt-1 break-words">Ly do: {fallbackReason}</div>}
          </div>
        )}

        {showCitations && Array.isArray(message.citations) && message.citations.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.citations.map((c, idx) => (
              <div key={`${message.id}-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <div className="font-medium">
                  {c.title} #{c.chunkIndex ?? "-"}
                </div>
                <div className="mt-1 leading-5">{c.snippet}</div>
              </div>
            ))}
          </div>
        )}

        <div className={`mt-2 text-[11px] ${isUser ? "text-blue-100" : "text-slate-400"} text-right`}>
          {fmtTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
