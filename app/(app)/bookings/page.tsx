"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { fmtDate, fmtMinutes, fmtTime } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";
import { Badge } from "../../components/ui/Badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  VideoIcon,
} from "../../components/Icons";
import type { SessionDoc } from "../../lib/types";

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

const monthName = (m: number) =>
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][m];

const bookingTimeRange = (session: SessionDoc) => {
  if (!session.scheduledFor) return "Time not set";
  const start = new Date(session.scheduledFor);
  const end = new Date(
    start.getTime() + Number(session.durationMinutes || 0) * 60 * 1000
  );
  return `${fmtTime(start)} - ${fmtTime(end)}`;
};

export default function BookingsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [items, setItems] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "completed" | "cancelled">("live");

  // Reset the day filter whenever the visible month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [year, month]);

  useEffect(() => {
    let cancel = false;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    (async () => {
      setLoading(true);
      try {
        const r = await api.get<SessionDoc[]>("/sessions/mine/calendar", {
          from: start.toISOString(),
          to: end.toISOString(),
        });
        if (!cancel) setItems(r.data || []);
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [year, month]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; inMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
    while (cells.length % 7 !== 0) cells.push({ day: null, inMonth: false });
    return cells;
  }, [year, month]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, SessionDoc[]>();
    for (const s of items) {
      if (!s.scheduledFor) continue;
      const d = new Date(s.scheduledFor);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    return map;
  }, [items, month, year]);

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isUpcomingStatus = (s: SessionDoc) =>
    s.status === "pending" ||
    s.status === "consent" ||
    s.status === "waiting" ||
    s.status === "live";

  const statusGroup = (s: SessionDoc) => {
    if (s.status === "completed") return "completed";
    if (s.status === "cancelled" || s.status === "no_show" || s.status === "expired") {
      return "cancelled";
    }
    return "live";
  };

  const counts = useMemo(
    () => ({
      live: items.filter((s) => statusGroup(s) === "live").length,
      completed: items.filter((s) => statusGroup(s) === "completed").length,
      cancelled: items.filter((s) => statusGroup(s) === "cancelled").length,
    }),
    [items]
  );

  const totalAll = counts.live + counts.completed + counts.cancelled || 1;
  const pct = {
    upcoming: (counts.live / totalAll) * 100,
    completed: (counts.completed / totalAll) * 100,
    cancelled: (counts.cancelled / totalAll) * 100,
  };

  const byTime = (a: SessionDoc, b: SessionDoc) =>
    new Date(a.scheduledFor || 0).getTime() -
    new Date(b.scheduledFor || 0).getTime();

  // When a calendar day is selected, show ALL sessions for that day.
  // Otherwise show the month's upcoming bookings.
  const visibleList = (
    selectedDay != null
      ? sessionsByDay.get(selectedDay) || []
      : items
  )
    .filter((s) => statusGroup(s) === activeTab)
    .slice()
    .sort(byTime);

  const listHeading =
    selectedDay != null
      ? `${TABS.find((t) => t.key === activeTab)?.label} bookings on ${selectedDay} ${monthName(month)} ${year}`
      : `${TABS.find((t) => t.key === activeTab)?.label} Bookings`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-500 mt-1">
          View and manage your upcoming appointments
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_1.3fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Sessions Overview</h3>
            <span className="text-xs text-slate-500">
              {monthName(month)} {year}
            </span>
          </div>
          <div className="flex items-center justify-center py-2">
            <DonutChart
              data={[
                { value: counts.live, color: "#d4a72c", label: "Upcoming" },
                { value: counts.completed, color: "#10b981", label: "Completed" },
                { value: counts.cancelled, color: "#dc2626", label: "Cancelled" },
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

        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Bookings Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeftIcon size={14} />
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              className="h-9 px-3 rounded-lg bg-[#0a7a90] text-white text-sm hover:bg-[#076377] inline-flex items-center gap-1"
            >
              Next
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center py-2">
              {d}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16 sm:h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {grid.map((c, i) => {
              const isToday =
                c.day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const sessionsForDay = c.day ? sessionsByDay.get(c.day) || [] : [];
              const has = sessionsForDay.length > 0;
              const isSelected = c.day != null && c.day === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!c.day || !has}
                  onClick={() =>
                    setSelectedDay((prev) => (prev === c.day ? null : c.day))
                  }
                  className={`min-h-16 sm:min-h-22 w-full text-left rounded-lg sm:rounded-xl border p-1.5 sm:p-2 transition-colors ${
                    has ? "cursor-pointer" : "cursor-default"
                  } ${
                    isSelected
                      ? "bg-[#0a7a90] text-white border-[#0a7a90] ring-2 ring-[#0a7a90]/40"
                      : isToday
                        ? "bg-[#0a7a90] text-white border-[#0a7a90]"
                        : has
                          ? "bg-sky-50 border-sky-100 hover:bg-sky-100"
                          : c.inMonth
                            ? "bg-white border-slate-200"
                            : "bg-slate-50/50 border-transparent"
                  }`}
                >
                  {c.day ? (
                    <>
                      <div
                        className={`text-sm font-semibold ${
                          isSelected || isToday ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {c.day}
                      </div>
                      {has && (
                        <div
                          className={`mt-1 text-[10px] truncate ${
                            isSelected || isToday ? "text-white" : "text-[#0a7a90]"
                          }`}
                        >
                          {sessionsForDay.length} booking
                          {sessionsForDay.length === 1 ? "" : "s"}
                        </div>
                      )}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
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
              onClick={() => setActiveTab(t.key)}
              className={`h-12 rounded-xl border border-slate-200 font-semibold text-sm transition-colors ${cls[t.tone]}`}
            >
              {t.label} ({String(counts[t.key]).padStart(2, "0")})
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-slate-900">{listHeading}</h3>
          {selectedDay != null && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sm font-medium text-[#0a7a90] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="space-y-2">
          {visibleList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              {selectedDay != null
                ? "No bookings on this day."
                : "No upcoming bookings this month."}
            </div>
          ) : (
            visibleList.map((s) => {
              const u = populated(s.user);
              return (
                <div
                  key={s._id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={u.name} src={u.profilePhoto} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">
                      {u.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        Time {bookingTimeRange(s)} - {fmtMinutes(s.durationMinutes || 0)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        Date {fmtDate(s.scheduledFor)}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-1 capitalize inline-flex items-center gap-1">
                      <VideoIcon size={12} />
                      {s.type} Session
                    </div>
                  </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <Badge
                      tone={
                        s.status === "live" || s.status === "completed"
                          ? "success"
                          : s.status === "cancelled" || s.status === "no_show"
                            ? "danger"
                            : "warning"
                      }
                      className="capitalize"
                    >
                      {s.status === "live"
                        ? "Live"
                        : s.status === "completed"
                          ? "Completed"
                          : s.status === "cancelled"
                            ? "Cancelled"
                            : s.status === "no_show"
                              ? "No Show"
                              : s.status === "waiting"
                                ? "Waiting"
                                : s.status === "consent"
                                  ? "Consent"
                                  : "Pending"}
                    </Badge>
                    {isUpcomingStatus(s) ? (
                      <Link href={`/sessions/${s._id}/live`}>
                        <button
                          type="button"
                          className="px-3 h-8 rounded-lg bg-[#0a7a90] text-white text-xs font-semibold flex items-center gap-1 hover:bg-[#076377]"
                        >
                          <VideoIcon size={12} />
                          Join Session
                        </button>
                      </Link>
                    ) : (
                      <Link href={`/sessions/${s._id}`}>
                        <button
                          type="button"
                          className="px-3 h-8 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                          View Details
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
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
