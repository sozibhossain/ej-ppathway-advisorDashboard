"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChevronLeftIcon, TrashIcon, CheckIcon } from "../../components/Icons";
import type { NotificationDoc } from "../../lib/types";

const PAGE_SIZE = 10;

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

const sessionIdOf = (n: NotificationDoc): string | undefined =>
  (n.data?.sessionId || n.data?.session) as string | undefined;

const contractTokenOf = (n: NotificationDoc): string | undefined =>
  (n.data?.action === "sign-contract"
    ? (n.data?.contractToken as string | undefined)
    : undefined);

// The in-app destination for a notification, or null if it isn't navigable.
const linkFor = (n: NotificationDoc): string | null => {
  const token = contractTokenOf(n);
  if (token) return `/contract/sign?token=${encodeURIComponent(token)}`;
  const sid = sessionIdOf(n);
  if (sid) return `/sessions/${sid}`;
  return null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const r = await api.get<{ items: NotificationDoc[] }>("/notifications", {
          page: p,
          limit: PAGE_SIZE,
        });
        setItems(r.data?.items || []);
        const meta = (r.meta || undefined) as
          | { page?: number; limit?: number; total?: number; totalPages?: number }
          | undefined;
        const tp =
          meta?.totalPages ??
          (meta?.total != null ? Math.max(1, Math.ceil(meta.total / PAGE_SIZE)) : 1);
        setTotalPages(tp);
        setSelected(new Set());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((s) => s.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const onRowClick = (n: NotificationDoc) => {
    if (!n.read) markRead(n._id);
    const dest = linkFor(n);
    if (dest) router.push(dest);
  };

  const markAll = async () => {
    try {
      await api.post(`/notifications/read-all`, {});
      setItems((s) => s.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((s) => s.filter((n) => n._id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((n) => n._id)));

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      await api.post(`/notifications/bulk-delete`, { ids });
      setItems((s) => s.filter((n) => !selected.has(n._id)));
      setSelected(new Set());
      toast.success(`Deleted ${ids.length} notification${ids.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete selected");
    } finally {
      setBulkDeleting(false);
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

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s your all Notifications</p>
        </div>
        <button
          type="button"
          onClick={markAll}
          className="text-sm font-medium text-[#0a7a90] hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Selection toolbar */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <span
              className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                allSelected
                  ? "bg-[#0a7a90] border-[#0a7a90] text-white"
                  : "bg-white border-slate-300"
              }`}
            >
              {allSelected && <CheckIcon size={13} />}
            </span>
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </button>

          {selected.size > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              <TrashIcon size={14} />
              {bulkDeleting ? "Deleting…" : `Delete selected (${selected.size})`}
            </button>
          )}
        </div>
      )}

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
          {items.map((n) => {
            const isSelected = selected.has(n._id);
            const navigable = !!linkFor(n);
            return (
              <div
                key={n._id}
                onClick={() => onRowClick(n)}
                className={`group relative bg-white rounded-xl border shadow-sm pl-5 pr-4 py-4 overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-l-xl ${stripeFor(
                  n.type
                )} ${isSelected ? "border-[#0a7a90] ring-1 ring-[#0a7a90]" : "border-slate-200"} ${
                  n.read ? "opacity-75" : ""
                } ${navigable ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-start gap-3">
                  {/* Selection checkbox */}
                  <button
                    type="button"
                    aria-label="Select notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(n._id);
                    }}
                    className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-[#0a7a90] border-[#0a7a90] text-white"
                        : "bg-white border-slate-300 hover:border-[#0a7a90]"
                    }`}
                  >
                    {isSelected && <CheckIcon size={13} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{n.title}</div>
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

                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-[#0a7a90] mt-1.5 shrink-0" />
                  )}

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
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
