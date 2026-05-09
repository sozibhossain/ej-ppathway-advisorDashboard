"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeftIcon,
  ChatIcon,
  StarIcon,
  BellIcon,
  TrashIcon,
} from "../../components/Icons";
import type { NotificationDoc } from "../../lib/types";

const colorFor = (type: string) => {
  if (type.includes("review"))
    return "border-amber-400 bg-amber-50/40 text-amber-700";
  if (type.includes("booking") || type.includes("session"))
    return "border-emerald-400 bg-emerald-50/40 text-emerald-700";
  if (type.includes("session_request"))
    return "border-sky-400 bg-sky-50/40 text-sky-700";
  return "border-slate-300 bg-slate-50/40 text-slate-700";
};

const iconFor = (type: string) => {
  if (type.includes("review")) return <StarIcon size={14} filled />;
  if (type.includes("booking") || type.includes("session")) return <ChatIcon size={14} />;
  return <BellIcon size={14} />;
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

  const markAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems((s) => s.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <span className="text-sm text-slate-600">Go Back</span>
      </div>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Here's your notifications</p>
        </div>
        <Button variant="outline" onClick={markAll}>
          Mark all read
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          You have no notifications.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n._id}
              className={`bg-white rounded-2xl border-l-4 border border-slate-200 ${
                !n.read ? "shadow-sm" : "opacity-80"
              } pl-4 pr-2 py-3 ${colorFor(n.type)}`}
              onClick={() => !n.read && markRead(n._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center mt-0.5">
                    {iconFor(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">
                      {n.title}
                    </div>
                    {n.body ? (
                      <div className="text-xs text-slate-600 mt-0.5">
                        {n.body}
                      </div>
                    ) : null}
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n._id);
                  }}
                  className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
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
