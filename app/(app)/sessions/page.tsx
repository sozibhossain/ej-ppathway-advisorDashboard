"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import {
  fmtDate,
  fmtMinutes,
  fmtTime,
  fmtCredits,
  fmtSessionTimeLeft,
  isSessionTimeActive,
} from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Skeleton, StatGridSkeleton, CardSkeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/Modal";
import {
  ChevronRightIcon,
  TrashIcon,
  EyeIcon,
  ChatIcon,
  PhoneIcon,
  VideoIcon,
  StarIcon,
} from "../../components/Icons";
import type { SessionDoc, SessionType } from "../../lib/types";

const TABS: { key: "live" | "completed" | "cancelled"; label: string; tone: string }[] = [
  { key: "live", label: "Live", tone: "blue" },
  { key: "completed", label: "Completed", tone: "emerald" },
  { key: "cancelled", label: "Cancelled", tone: "rose" },
];

const populated = (
  ref: SessionDoc["user"] | SessionDoc["advisor"]
): { _id: string; name: string; profilePhoto?: string } => {
  if (!ref || typeof ref === "string") return { _id: "", name: "Client" };
  return ref;
};

const typeIcon = (t: SessionType) => {
  if (t === "video") return <VideoIcon size={14} />;
  if (t === "call") return <PhoneIcon size={14} />;
  return <ChatIcon size={14} />;
};

export default function SessionsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"live" | "completed" | "cancelled">(
    "live"
  );
  const [counts, setCounts] = useState<Record<string, number>>({
    live: 0,
    completed: 0,
    cancelled: 0,
  });
  const [overviewItems, setOverviewItems] = useState<SessionDoc[]>([]);
  const [items, setItems] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 5;

  const [confirmCancel, setConfirmCancel] = useState<SessionDoc | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Counts + upcoming overview
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [live, comp, canc, upcoming] = await Promise.all([
          api.get<SessionDoc[]>("/sessions/mine/advisor", {
            tab: "live",
            limit: 100,
          }),
          api.get<SessionDoc[]>("/sessions/mine/advisor", {
            tab: "completed",
            limit: 100,
          }),
          api.get<SessionDoc[]>("/sessions/mine/advisor", {
            tab: "cancelled",
            limit: 100,
          }),
          api.get<SessionDoc[]>("/sessions/mine/advisor", {
            limit: 6,
          }),
        ]);
        if (cancel) return;
        setCounts({
          live: live.meta?.total || live.data?.length || 0,
          completed: comp.meta?.total || comp.data?.length || 0,
          cancelled: canc.meta?.total || canc.data?.length || 0,
        });
        const all = upcoming.data || [];
        setOverviewItems(
          all
            .filter(
              (s) =>
                s.status === "pending" ||
                s.status === "consent" ||
                s.status === "waiting" ||
                s.status === "live"
            )
            .slice(0, 6)
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Tab data
  useEffect(() => {
    let cancel = false;
    (async () => {
      setTabLoading(true);
      try {
        const r = await api.get<SessionDoc[]>("/sessions/mine/advisor", {
          tab: activeTab,
          page,
          limit,
        });
        if (cancel) return;
        setItems(r.data || []);
        setTotal(r.meta?.total || 0);
        setSelected(new Set());
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
        if (!cancel) setTabLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [activeTab, page]);

  const onCancel = async () => {
    if (!confirmCancel) return;
    setCancelLoading(true);
    try {
      await api.post(`/sessions/${confirmCancel._id}/cancel`, {
        reason: cancelReason,
      });
      toast.success("Session cancelled");
      setConfirmCancel(null);
      setCancelReason("");
      // refetch
      const r = await api.get<SessionDoc[]>("/sessions/mine/advisor", {
        tab: activeTab,
        page,
        limit,
      });
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
      setCounts((c) => ({
        ...c,
        live: Math.max(0, c.live - 1),
        cancelled: c.cancelled + 1,
      }));
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Cancel failed";
      toast.error(m);
    } finally {
      setCancelLoading(false);
    }
  };

  const onBulkCancel = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          api.post(`/sessions/${id}/cancel`, {
            reason: "Bulk cancellation by advisor",
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (ok > 0) toast.success(`${ok} session${ok === 1 ? "" : "s"} cancelled`);
      if (failed > 0) toast.error(`${failed} could not be cancelled`);
      setConfirmBulk(false);
      setSelected(new Set());
      // refetch current tab
      const r = await api.get<SessionDoc[]>("/sessions/mine/advisor", {
        tab: activeTab,
        page,
        limit,
      });
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
      setCounts((c) => ({
        ...c,
        live: Math.max(0, c.live - ok),
        cancelled: c.cancelled + ok,
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk cancel failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total]
  );

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <StatGridSkeleton count={4} />
        <CardSkeleton className="h-64" />
      </div>
    );
  }

  // Pie data
  const totalAll = counts.live + counts.completed + counts.cancelled || 1;
  const pct = {
    upcoming: (counts.live / totalAll) * 100,
    completed: (counts.completed / totalAll) * 100,
    cancelled: (counts.cancelled / totalAll) * 100,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
        <div className="text-xs text-slate-500 mt-1">
          <Link href="/" className="hover:underline">
            Dashboard
          </Link>
          {" › "}
          <span className="text-[#0a7a90] font-medium">Sessions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Sessions Overview</h3>
            <button
              type="button"
              onClick={() => {
                setActiveTab("live");
                setPage(1);
                scrollToTable();
              }}
              className="text-xs text-[#0a7a90] font-semibold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex items-center justify-center py-2">
            <DonutChart
              data={[
                { value: counts.live, color: "#d4a72c", label: "Upcoming" },
                {
                  value: counts.completed,
                  color: "#10b981",
                  label: "Completed",
                },
                {
                  value: counts.cancelled,
                  color: "#dc2626",
                  label: "Cancelled",
                },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <Legend
              dot="#d4a72c"
              label="Upcoming"
              value={`${counts.live} (${pct.upcoming.toFixed(1)}%)`}
            />
            <Legend
              dot="#10b981"
              label="Completed"
              value={`${counts.completed} (${pct.completed.toFixed(1)}%)`}
            />
            <Legend
              dot="#dc2626"
              label="Cancelled"
              value={`${counts.cancelled} (${pct.cancelled.toFixed(1)}%)`}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Upcoming Bookings</h3>
            <Link
              href="/bookings"
              className="text-xs text-[#0a7a90] font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2 max-h-75 overflow-y-auto thin-scroll">
            {overviewItems.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">
                Nothing scheduled
              </div>
            ) : (
              overviewItems.map((s) => {
                const u = populated(s.user);
                return (
                  <Link
                    key={s._id}
                    href={`/sessions/${s._id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <Avatar name={u.name} src={u.profilePhoto} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {u.name}
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        {s.type} Call ·{" "}
                        {isSessionTimeActive(s, now)
                          ? `Time left ${fmtSessionTimeLeft(s, now)}`
                          : fmtTime(s.scheduledFor)}
                      </div>
                    </div>
                    <ChevronRightIcon size={16} className="text-slate-400" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          const cls: Record<string, string> = {
            blue: active
              ? "bg-[#0a7a90] text-white"
              : "bg-white text-slate-600 hover:bg-slate-100",
            emerald: active
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100",
            rose: active
              ? "bg-red-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100",
          };
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveTab(t.key);
                setPage(1);
              }}
              className={`h-12 rounded-xl border border-slate-200 font-semibold text-sm transition-colors ${cls[t.tone]}`}
            >
              {t.label} ({String(counts[t.key]).padStart(2, "0")})
            </button>
          );
        })}
      </div>

      <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 p-5">
        {selected.size > 0 ? (
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <span className="font-semibold">{selected.size}</span> Selected ·{" "}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[#0a7a90] hover:underline"
              >
                Deselect all
              </button>
            </div>
            {activeTab === "live" ? (
              <button
                type="button"
                onClick={() => setConfirmBulk(true)}
                aria-label="Cancel selected sessions"
                title="Cancel selected sessions"
                className="h-9 w-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
              >
                <TrashIcon size={16} />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelected(new Set(items.map((i) => i._id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="px-3 py-3 text-left font-semibold">User</th>
                <th className="px-3 py-3 text-left font-semibold">Type</th>
                {activeTab === "completed" && (
                  <>
                    <th className="px-3 py-3 text-left font-semibold">
                      Duration
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Earned
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Rating
                    </th>
                  </>
                )}
                {activeTab === "cancelled" && (
                  <th className="px-3 py-3 text-left font-semibold">Reason</th>
                )}
                {activeTab === "live" && (
                  <th className="px-3 py-3 text-left font-semibold">Time</th>
                )}
                <th className="px-3 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {tabLoading ? (
                Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r} className="border-b border-slate-50 last:border-0">
                    {Array.from({ length: 8 }).map((_, c) => (
                      <td key={c} className="px-5 py-4">
                        <Skeleton className="h-3 w-full max-w-25" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-slate-500 text-sm"
                  >
                    No {activeTab} sessions
                  </td>
                </tr>
              ) : (
                items.map((s) => {
                  const u = populated(s.user);
                  const sel = selected.has(s._id);
                  return (
                    <tr
                      key={s._id}
                      className={`border-b border-slate-100 ${
                        sel ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(s._id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={u.name}
                            src={u.profilePhoto}
                            size={28}
                          />
                          <span className="font-medium text-slate-900">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 capitalize text-slate-700">
                          {typeIcon(s.type)}
                          {s.type}
                        </span>
                      </td>
                      {activeTab === "completed" && (
                        <>
                          <td className="px-3 py-3 text-slate-700">
                            {s.durationMinutes
                              ? `${String(s.durationMinutes).padStart(2, "0")}:00`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 font-semibold text-emerald-600">
                            {fmtCredits(s.advisorPayout || s.chargedAmount)}
                          </td>
                          <td className="px-3 py-3">
                            {typeof s.rating === "number" ? (
                              <div className="flex items-center gap-1 text-amber-500">
                                <StarIcon size={14} filled />
                                <span className="text-slate-900 font-semibold">
                                  {s.rating.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">
                                Not rated
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {activeTab === "cancelled" && (
                        <td className="px-3 py-3 text-slate-600 max-w-65 truncate">
                          {s.cancelReason || "—"}
                        </td>
                      )}
                      {activeTab === "live" && (
                        <td className="px-3 py-3 text-slate-600">
                          {isSessionTimeActive(s, now)
                            ? `Time left ${fmtSessionTimeLeft(s, now)}`
                            : fmtTime(s.startedAt || s.scheduledFor)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-slate-600">
                        {fmtDate(s.cancelledAt || s.endedAt || s.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/sessions/${s._id}`}
                            className="text-[#0a7a90] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                          >
                            <EyeIcon size={14} />
                            View Details
                          </Link>
                          {s.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() => setConfirmCancel(s)}
                              className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                              aria-label="Cancel session"
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-slate-500">
            Showing {(page - 1) * limit + (items.length ? 1 : 0)} to{" "}
            {(page - 1) * limit + items.length} of {total} results
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹
            </Button>
            <span className="px-3 text-sm bg-[#0a7a90] text-white rounded-lg h-8 inline-flex items-center font-semibold">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={onBulkCancel}
        title={`Cancel ${selected.size} session${selected.size === 1 ? "" : "s"}?`}
        description="The selected sessions will be cancelled. This action cannot be undone."
        confirmText="Cancel sessions"
        cancelText="Not now"
        danger
        loading={bulkLoading}
      />

      <ConfirmDialog
        open={!!confirmCancel}
        onClose={() => {
          setConfirmCancel(null);
          setCancelReason("");
        }}
        onConfirm={onCancel}
        title="Are you sure?"
        description="You want to Cancel this session put a reason to why you want to cancel the session"
        confirmText="Cancel Session"
        cancelText="Not now"
        danger
        loading={cancelLoading}
      >
        <div className="text-left mt-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Enter Reason of Cancellation
          </label>
          <textarea
            rows={4}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Type your reason here....."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20 focus:outline-none"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Legend({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full inline-block"
        style={{ backgroundColor: dot }}
      />
      <div>
        <div className="text-slate-700 font-medium">{label}</div>
        <div className="text-slate-500 text-[10px]">{value}</div>
      </div>
    </div>
  );
}

function DonutChart({
  data,
}: {
  data: { value: number; color: string; label: string }[];
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;

  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-40 sm:w-48 md:w-52 h-auto">
      <g transform="translate(100,100) rotate(-90)">
        <circle
          r={r}
          cx="0"
          cy="0"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="22"
        />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const off = -acc;
          acc += len;
          if (d.value === 0) return null;
          return (
            <circle
              key={i}
              r={r}
              cx="0"
              cy="0"
              fill="none"
              stroke={d.color}
              strokeWidth="22"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={off}
            />
          );
        })}
      </g>
    </svg>
  );
}
