"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import type { ChatDoc, MessageDoc } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../lib/toast";
import { ChatIcon } from "../../components/Icons";

const senderId = (message: MessageDoc) =>
  typeof message.sender === "string" ? message.sender : message.sender?._id;

export default function AdvisorSupportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chat, setChat] = useState<ChatDoc | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const urlChatId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("chatId")
            : "";
        const chatRes = urlChatId
          ? await api.get<ChatDoc>(`/chats/${urlChatId}`)
          : await api.post<ChatDoc>("/chats/admin", {});
        if (!cancel) setChat(chatRes.data || null);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not open support chat");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!chat?._id) return;
    let cancel = false;
    const load = async () => {
      try {
        const res = await api.get<MessageDoc[]>(`/chats/${chat._id}/messages`, { limit: 100 });
        if (!cancel) {
          setMessages(res.data || []);
          api.post(`/chats/${chat._id}/read`, {}).catch(() => {});
        }
      } catch {
        // Keep the current messages visible if polling fails.
      }
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [chat?._id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !chat?._id || sending) return;
    setSending(true);
    try {
      const res = await api.post<MessageDoc>(`/chats/${chat._id}/messages`, { text });
      if (res.data) setMessages((items) => [...items, res.data!]);
      setDraft("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Message failed");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton className="h-20" />
        <CardSkeleton className="h-[520px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Advisor Support</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chat directly with the admin team about your advisor account.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="h-16 px-5 border-b border-slate-100 flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-[#0a7a90] text-white inline-flex items-center justify-center">
            <ChatIcon size={18} />
          </span>
          <div>
            <div className="font-semibold text-slate-900">Admin Support</div>
            <div className="text-xs text-slate-500">Replies from Prophetic Pathway support</div>
          </div>
        </div>

        <div ref={scrollRef} className="h-[480px] overflow-y-auto bg-slate-50 px-4 py-5 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center">
              No messages yet. Send your question to start the support conversation.
            </div>
          ) : (
            messages.map((message) => {
              const mine = senderId(message) === user?._id;
              const sender = typeof message.sender === "object" ? message.sender : null;
              return (
                <div key={message._id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && <Avatar name={sender?.name || "Admin"} src={sender?.profilePhoto} size={30} />}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      mine
                        ? "bg-[#0a7a90] text-white rounded-br-md"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                    }`}
                  >
                    {message.text}
                    <div className={`mt-1 text-[10px] ${mine ? "text-teal-50" : "text-slate-400"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={send} className="border-t border-slate-100 p-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-[#0a7a90]"
          />
          <Button type="submit" disabled={!draft.trim() || sending || !chat?._id} loading={sending}>
            Send
          </Button>
        </form>
      </section>
    </div>
  );
}
