import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../utils/toast";
import { createChatSession, getChatSession, sendChatMessage } from "../../services/chat.service";
import ChatBubble from "../../components/chat/ChatBubble";

function logChatError(scope, error) {
  console.error(`[PatientChat] ${scope}`, {
    message: error?.message,
    status: error?.response?.status,
    code: error?.response?.data?.error?.code,
    serverMessage: error?.response?.data?.error?.message,
    details: error?.response?.data?.error?.details,
    raw: error,
  });
}

export default function PatientChat() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");

  const ensureSessionMutation = useMutation({
    mutationFn: () => createChatSession({}),
    onSuccess: (res) => {
      const id = res?.data?.id;
      if (id) setSessionId(id);
    },
    onError: (error) => {
      logChatError("createSession", error);
      toast.error(error?.response?.data?.error?.message || "Không tạo được phiên chat.");
    },
  });

  const sessionQ = useQuery({
    queryKey: ["chat-session", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => getChatSession(sessionId),
    refetchInterval: 15000,
    onError: (error) => {
      logChatError("getSession", error);
    },
  });

  const messages = useMemo(() => sessionQ.data?.data?.messages ?? [], [sessionQ.data]);

  const sendMutation = useMutation({
    mutationFn: () => sendChatMessage(sessionId, { content: message, topK: 5 }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
    },
    onError: (error) => {
      logChatError("sendMessage", error);
      toast.error(error?.response?.data?.error?.message || "Không gửi được tin nhắn.");
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Chatbot tiền khám (FAQ)</h1>
        <p className="mt-1 text-sm opacity-70">
          Trả lời dựa trên knowledge base nội bộ, có trích dẫn nguồn.
        </p>
      </div>

      {!sessionId ? (
        <div className="rounded-2xl border border-base-200 bg-base-100 p-6 text-center">
          <button
            className="btn btn-primary"
            onClick={() => ensureSessionMutation.mutate()}
            disabled={ensureSessionMutation.isPending}
          >
            {ensureSessionMutation.isPending ? "Đang tạo session..." : "Bắt đầu hội thoại"}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5 space-y-4">
            {sessionQ.isLoading ? (
              <div className="text-sm opacity-70">Đang tải hội thoại...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm opacity-70">Hãy gửi câu hỏi đầu tiên của bạn.</div>
            ) : (
              messages.map((m) => <ChatBubble key={m.id} message={m} />)
            )}
          </div>

          <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                className="textarea textarea-bordered min-h-24 flex-1"
                placeholder="Nhập câu hỏi của bạn"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                className="btn btn-primary sm:self-end"
                disabled={sendMutation.isPending || message.trim().length < 1}
                onClick={() => sendMutation.mutate()}
              >
                {sendMutation.isPending ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
