"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../../../lib/api";
import { useToast } from "../../../../lib/toast";
import { fmtCurrency, fmtDuration } from "../../../../lib/format";
import { Avatar } from "../../../../components/ui/Avatar";
import { Button } from "../../../../components/ui/Button";
import { Spinner } from "../../../../components/ui/Spinner";
import { Modal } from "../../../../components/ui/Modal";
import {
  CameraIcon,
  MicIcon,
  MicOffIcon,
  MaximizeIcon,
  PhoneIcon,
  SendIcon,
  StarIcon,
  PaperclipIcon,
} from "../../../../components/Icons";
import type { MessageDoc, SessionDoc } from "../../../../lib/types";

const populated = (
  ref: SessionDoc["user"] | SessionDoc["advisor"]
): { _id: string; name: string; profilePhoto?: string } => {
  if (!ref || typeof ref === "string") return { _id: "", name: "Client" };
  return ref;
};

export default function LiveSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [earned, setEarned] = useState(0);
  const [ending, setEnding] = useState(false);

  // chat state
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // post-end summary
  const [showSummary, setShowSummary] = useState(false);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [summaryRating, setSummaryRating] = useState(0);
  const [summaryDuration, setSummaryDuration] = useState(0);
  const [summaryEarned, setSummaryEarned] = useState(0);

  const myId = useRef<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("ej_advisor_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        myId.current = u?._id || "";
      } catch {
        // ignore
      }
    }
  }, []);

  // Load session
  useEffect(() => {
    if (!id) return;
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<SessionDoc>(`/sessions/${id}`);
        if (!cancel) {
          setSession(r.data || null);
          if (r.data?.startedAt) {
            setElapsed(
              Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(r.data.startedAt).getTime()) / 1000
                )
              )
            );
          }
        }

        // For chat sessions, ensure chat exists
        if (r.data?.type === "chat") {
          const c = await api.post<{ _id: string }>(`/chats/session/${id}`);
          if (!cancel) setChatId(c.data?._id || null);
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, toast]);

  // Tick timer + heartbeat
  useEffect(() => {
    if (!session || session.status !== "live") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== "live") return;
    let cancel = false;
    const beat = async () => {
      try {
        const r = await api.post<{
          session: SessionDoc;
          elapsedSec: number;
          autoEnded?: boolean;
        }>(`/sessions/${session._id}/heartbeat`);
        if (cancel) return;
        if (r.data?.session) {
          setSession(r.data.session);
          setEarned(r.data.session.advisorPayout || r.data.session.chargedAmount || 0);
        }
        if (r.data?.autoEnded) {
          handleAutoEnd(r.data.session);
        }
      } catch {
        // ignore
      }
    };
    const id1 = setInterval(beat, 30000);
    beat();
    return () => {
      cancel = true;
      clearInterval(id1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id, session?.status]);

  // Load chat messages
  useEffect(() => {
    if (!chatId) return;
    let cancel = false;
    const load = async () => {
      try {
        const r = await api.get<MessageDoc[]>(`/chats/${chatId}/messages`, {
          limit: 50,
        });
        if (!cancel) setMessages(r.data || []);
      } catch {
        // ignore
      }
    };
    load();
    const i = setInterval(load, 4000);
    return () => {
      cancel = true;
      clearInterval(i);
    };
  }, [chatId]);

  const handleAutoEnd = (s: SessionDoc) => {
    setSummaryDuration(elapsed);
    setSummaryEarned(s.advisorPayout || s.chargedAmount || 0);
    setShowSummary(true);
  };

  const onEnd = async () => {
    if (!session) return;
    setEnding(true);
    try {
      const r = await api.post<SessionDoc>(`/sessions/${session._id}/end`);
      if (r.data) {
        setSession(r.data);
        setSummaryDuration(elapsed);
        setSummaryEarned(
          r.data.advisorPayout || r.data.chargedAmount || earned
        );
        setShowSummary(true);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "End failed");
    } finally {
      setEnding(false);
    }
  };

  const onSendMessage = async () => {
    if (!chatId || (!draft.trim() && true)) return;
    setSending(true);
    try {
      const r = await api.post<MessageDoc>(
        `/chats/${chatId}/messages`,
        { text: draft },
        {}
      );
      if (r.data) setMessages((m) => [...m, r.data!]);
      setDraft("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const submitSummary = async () => {
    if (!session) return;
    try {
      if (summaryNotes.trim()) {
        await api.post(`/sessions/${session._id}/notes`, {
          notes: summaryNotes,
        });
      }
      toast.success("Session saved");
    } catch {
      // ignore
    } finally {
      router.push("/sessions");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );

  if (!session)
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Session not found</p>
      </div>
    );

  const u = populated(session.user);

  // Header card
  const Header = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} src={u.profilePhoto} size={48} />
        <div>
          <div className="font-bold text-slate-900">{u.name}</div>
          <div className="text-xs text-slate-500 capitalize flex items-center gap-2">
            {session.type} Session
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              live
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 hidden sm:flex items-center justify-around">
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums">
            {fmtDuration(elapsed)}
          </div>
          <div className="text-[11px] text-slate-500">Session Time</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">
            {fmtCurrency(session.ratePerMin)}/min
          </div>
          <div className="text-[11px] text-slate-500">Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">
            {fmtCurrency(earned || session.chargedAmount || 0)}
          </div>
          <div className="text-[11px] text-slate-500">Current Earnings</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="danger" onClick={onEnd} loading={ending}>
          <PhoneIcon size={16} />
          End Session
        </Button>
        <button
          type="button"
          aria-label="Maximize"
          className="h-10 w-10 rounded-lg bg-[#0a7a90] text-white flex items-center justify-center"
        >
          <MaximizeIcon size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {Header}

      {session.type === "chat" && (
        <ChatBody
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={onSendMessage}
          sending={sending}
          myId={myId.current}
        />
      )}

      {session.type === "video" && <VideoBody u={u} onEnd={onEnd} ending={ending} />}

      {session.type === "call" && (
        <AudioBody u={u} elapsed={elapsed} earned={earned} onEnd={onEnd} ending={ending} />
      )}

      <Modal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        hideClose
        size="sm"
      >
        <div className="text-center py-2">
          <div className="h-14 w-14 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-3">
            <PhoneIcon size={28} className="text-emerald-600 rotate-[135deg]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Session Completed
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Thank you for your consultation with {u.name}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <SummaryCell
              tone="violet"
              label="Duration"
              value={fmtDuration(summaryDuration)}
            />
            <SummaryCell
              tone="emerald"
              label="Earned"
              value={fmtCurrency(summaryEarned)}
            />
            <SummaryCell tone="amber" label="Client" value={u.name.split(" ")[0]} />
          </div>

          <div className="mt-5">
            <div className="text-xs text-slate-500 mb-2">
              Rate this session (Optional)
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSummaryRating(i)}
                  className={
                    i <= summaryRating ? "text-amber-400" : "text-slate-300"
                  }
                >
                  <StarIcon size={28} filled={i <= summaryRating} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-left">
            <div className="text-xs text-slate-500 mb-1">
              Session Notes (Optional)
            </div>
            <textarea
              rows={4}
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Add any notes about this session..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 focus:border-[#0a7a90]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              onClick={() => router.push("/sessions")}
              className="h-11 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={submitSummary}
              className="h-11 rounded-lg bg-[#0a7a90] text-white hover:bg-[#076377] font-medium"
            >
              Submit & Continue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCell({
  tone,
  label,
  value,
}: {
  tone: "violet" | "emerald" | "amber";
  label: string;
  value: string;
}) {
  const cls: Record<string, string> = {
    violet: "bg-violet-100 text-violet-900",
    emerald: "bg-emerald-100 text-emerald-900",
    amber: "bg-amber-100 text-amber-900",
  };
  return (
    <div className={`rounded-xl p-3 ${cls[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="font-bold text-base mt-1">{value}</div>
    </div>
  );
}

function ChatBody({
  messages,
  draft,
  setDraft,
  onSend,
  sending,
  myId,
}: {
  messages: MessageDoc[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
  sending: boolean;
  myId: string;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col h-[68vh]">
      <div className="flex-1 overflow-y-auto p-4 thin-scroll space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-10">
            Conversation will appear here.
          </div>
        ) : (
          messages.map((m) => {
            const senderId =
              typeof m.sender === "string" ? m.sender : m.sender._id;
            const mine = senderId === myId;
            return (
              <div
                key={m._id}
                className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine ? (
                  <div className="h-8 w-8 rounded-full bg-[#0a7a90] text-white text-[10px] font-bold flex items-center justify-center">
                    {(typeof m.sender === "object" && m.sender.name) ||
                      "U"}{" "}
                  </div>
                ) : null}
                <div className="max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      mine ? "bg-[#0a7a90] text-white" : "bg-white text-slate-900 border border-slate-200"
                    }`}
                  >
                    {m.text}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        {m.attachments.map((a, idx) => (
                          <a
                            key={idx}
                            href={a}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-xs"
                          >
                            attachment {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] text-slate-400 mt-1 ${mine ? "text-right" : ""}`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {mine ? (
                  <div className="h-8 w-8 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                    You
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-slate-200 p-3 bg-white rounded-b-2xl flex items-center gap-2">
        <button
          type="button"
          aria-label="Attach"
          className="h-10 w-10 flex items-center justify-center text-slate-500"
        >
          <PaperclipIcon size={18} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!sending && draft.trim()) onSend();
            }
          }}
          placeholder="Type your answer here…"
          className="flex-1 h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !draft.trim()}
          className="h-10 w-10 rounded-lg bg-[#0a7a90] text-white flex items-center justify-center disabled:opacity-50"
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function VideoBody({
  u,
  onEnd,
  ending,
}: {
  u: { name: string; profilePhoto?: string };
  onEnd: () => void;
  ending: boolean;
}) {
  const [muted, setMuted] = useState(false);
  return (
    <div className="bg-slate-100 rounded-2xl border border-slate-200 h-[68vh] relative overflow-hidden">
      <div className="absolute inset-0">
        {u.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.profilePhoto}
            alt={u.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
            {u.name}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 w-40 h-28 rounded-lg bg-slate-900 border-2 border-white overflow-hidden flex items-center justify-center text-white text-xs">
        Your Camera
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Camera"
          className="h-10 w-10 rounded-lg bg-white text-slate-900 flex items-center justify-center"
        >
          <CameraIcon size={16} />
        </button>
        <button
          type="button"
          aria-label="Mute"
          onClick={() => setMuted((m) => !m)}
          className="h-10 w-10 rounded-lg bg-white text-slate-900 flex items-center justify-center"
        >
          {muted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="h-10 w-10 rounded-lg bg-slate-300 text-slate-900 flex items-center justify-center"
        >
          <MaximizeIcon size={16} />
        </button>
        <Button variant="danger" onClick={onEnd} loading={ending}>
          <PhoneIcon size={16} />
          End Session
        </Button>
      </div>
    </div>
  );
}

function AudioBody({
  u,
  elapsed,
  earned,
  onEnd,
  ending,
}: {
  u: { name: string; profilePhoto?: string };
  elapsed: number;
  earned: number;
  onEnd: () => void;
  ending: boolean;
}) {
  const [muted, setMuted] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 h-[60vh] flex flex-col items-center justify-center relative">
      <Avatar name={u.name} src={u.profilePhoto} size={140} />
      <div className="text-2xl font-bold text-slate-900 mt-4 flex items-center gap-2">
        {u.name}
        <MicIcon size={18} className="text-[#0a7a90]" />
      </div>
      <div className="text-3xl font-bold text-[#0a7a90] mt-2 tabular-nums">
        {fmtDuration(elapsed)}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        ${earned.toFixed(2)} so far
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-100 rounded-xl p-2 flex items-center gap-2 shadow">
        <button
          type="button"
          aria-label="Camera"
          className="h-10 w-10 rounded-lg bg-white text-slate-900 flex items-center justify-center"
        >
          <CameraIcon size={16} />
        </button>
        <button
          type="button"
          aria-label="Mute"
          onClick={() => setMuted((m) => !m)}
          className="h-10 w-10 rounded-lg bg-white text-slate-900 flex items-center justify-center"
        >
          {muted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="h-10 w-10 rounded-lg bg-slate-200 text-slate-900 flex items-center justify-center"
        >
          <MaximizeIcon size={16} />
        </button>
        <Button variant="danger" onClick={onEnd} loading={ending}>
          <PhoneIcon size={16} />
          End Session
        </Button>
      </div>
    </div>
  );
}
