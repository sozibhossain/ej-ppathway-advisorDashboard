"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChevronLeftIcon, TrashIcon } from "../../components/Icons";
import type { NotificationDoc } from "../../lib/types";

const stripeFor = (type: string) => {
  if (type.includes("review")) return "before:bg-amber-400";
  if (type.includes("booking")) return "before:bg-emerald-500";
  if (type.includes("session_request") || type.includes("session"))
    return "before:bg-[#0a7a90]";
  return "before:bg-slate-300";
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return d.toLocaleString();
};

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{
        items: NotificationDoc[];
        grouped: { new: NotificationDoc[]; earlier: NotificationDoc[] };
      }>("/notifications", { limit: 100 });
      setItems(r.data?.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((s) =>
        s.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((s) => s.filter((n) => n._id !== id));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
        >
          <span className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <ChevronLeftIcon size={16} />
          </span>
          Go Back
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Here&apos;s your all Notifications
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          You have no notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.read && markRead(n._id)}
              className={`group relative bg-white rounded-xl border border-slate-200 shadow-sm pl-5 pr-4 py-4 cursor-pointer overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-l-xl ${stripeFor(
                n.type
              )} ${n.read ? "opacity-75" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {n.body ? (
                      <span>
                        {n.body}
                        <span className="mx-2 text-slate-300">•</span>
                      </span>
                    ) : null}
                    {fmtTime(n.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
