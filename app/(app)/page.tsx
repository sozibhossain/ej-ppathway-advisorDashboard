"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import {
  fmtNumber,
  fmtTime,
  fmtDuration,
  tierLabel,
  fmtCredits,
  fmtSessionTimeLeft,
  isSessionTimeActive,
} from "../lib/format";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Skeleton, StatGridSkeleton, CardSkeleton } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import {
  TrendIcon,
  StarIcon,
  AwardIcon,
  ZapIcon,
  ChevronRightIcon,
  UserIcon,
  ChatIcon,
  VideoIcon,
  PhoneIcon,
  ClockIcon,
  CrownIcon,
} from "../components/Icons";
import type { DashboardData, ReviewDoc, SessionDoc } from "../lib/types";

const sessionTypeIcon = (t: string) => {
  if (t === "video") return <VideoIcon size={14} />;
  if (t === "call") return <PhoneIcon size={14} />;
  return <ChatIcon size={14} />;
};

function StatCard({
  title,
  value,
  trend,
  icon,
  tone,
  subtitle,
}: {
  title: string;
  value: React.ReactNode;
  trend?: string;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "amber" | "rose";
  subtitle?: string;
}) {
  const toneCls: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    blue: "bg-sky-50 border-sky-100 text-sky-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${toneCls[tone]}`}
        >
          {icon}
        </div>
        {trend ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
            <TrendIcon size={12} />
            {trend}
          </span>
        ) : null}
      </div>
      <div className="text-xs text-slate-500 mt-3">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {subtitle ? (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      ) : null}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={14} filled={i <= Math.round(value)} />
      ))}
    </div>
  );
}

const populated = (
  ref: SessionDoc["user"] | SessionDoc["advisor"]
): { _id: string; name: string; profilePhoto?: string } => {
  if (!ref || typeof ref === "string") return { _id: "", name: "Client" };
  return ref;
};

export default function DashboardHome() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<DashboardData>("/advisor/dashboard");
        if (!cancel) setData(r.data || null);
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (loading)
    return (
      <div className="px-6 md:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <StatGridSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    );

  const ongoing = data?.ongoing as SessionDoc | null | undefined;
  const upcoming = data?.upcoming || [];
  const reviews = data?.recentReviews || [];

  // Earnings curve: 7 days, _id 1=Sunday → 7=Saturday
  const curve = (data?.earningsCurve || []).reduce(
    (acc, c) => {
      acc[c._id] = c.total;
      return acc;
    },
    {} as Record<number, number>
  );
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = [2, 3, 4, 5, 6, 7, 1].map((d) => curve[d] || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0] || "Advisor"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with your sessions today.
          </p>
        </div>
        <Link
          href="/notifications"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-[#0a7a90] text-white text-sm font-medium hover:bg-[#076377]"
        >
          <ChatIcon size={16} />
          Chat with admin
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Earnings Today"
          value={fmtCredits(data?.earningsToday || 0)}
          trend="+14%"
          tone="emerald"
          icon={<TrendIcon size={18} />}
        />
        <StatCard
          title="Active Sessions"
          value={fmtNumber(data?.activeSessions || 0).padStart(2, "0")}
          trend="+20%"
          tone="blue"
          icon={<ZapIcon size={18} />}
        />
        <StatCard
          title="Pending Requests"
          value={fmtNumber(data?.pendingRequests || 0).padStart(2, "0")}
          trend="+5%"
          tone="amber"
          icon={<UserIcon size={18} />}
        />
        <StatCard
          title="Overall Ratings & Tier"
          value={
            <div className="flex items-center gap-2">
              <StarIcon size={20} filled />
              {(data?.ratings || 0).toFixed(1)}
            </div>
          }
          subtitle={`${tierLabel(data?.tier)} Advisor`}
          trend="+5%"
          tone="rose"
          icon={<AwardIcon size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              {ongoing ? "Ongoing Session" : "No Ongoing Session"}
            </span>
            {ongoing ? (
              <Badge tone="success" className="font-semibold">
                LIVE
              </Badge>
            ) : null}
          </div>

          {ongoing ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={populated(ongoing.user).name}
                    src={populated(ongoing.user).profilePhoto}
                    size={48}
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {populated(ongoing.user).name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ongoing.type} • {fmtCredits(ongoing.ratePerMin)}/min
                    </div>
                    <div className="mt-1">
                      <Badge tone="success">
                        {sessionTypeIcon(ongoing.type)}
                        <span className="ml-1 capitalize">
                          {ongoing.type} Session
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900 tabular-nums">
                    {fmtDuration(
                      ongoing.startedAt
                        ? Math.floor(
                            (Date.now() -
                              new Date(ongoing.startedAt).getTime()) /
                              1000
                          )
                        : 0
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Elapsed Time</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-lg font-bold text-slate-900">
                    {fmtCredits(ongoing.ratePerMin)}
                    <span className="text-sm font-normal text-slate-500">
                      /min
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Rate per minute
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-lg font-bold text-slate-900">
                    {fmtCredits(ongoing.chargedAmount)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Earning this session
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Link href={`/sessions/${ongoing._id}`} className="contents">
                  <Button variant="danger" className="w-full">
                    End Session
                  </Button>
                </Link>
                <Link
                  href={`/sessions/${ongoing._id}/live`}
                  className="contents"
                >
                  <Button className="w-full">Open Session</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 py-10 text-center">
              You have no live sessions right now.
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Upcoming Bookings</h3>
            <Link
              href="/bookings"
              className="text-xs text-[#0a7a90] font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">
                No upcoming bookings
              </div>
            ) : (
              upcoming.slice(0, 4).map((s) => {
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

        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Recent Activities</h3>
            <Link
              href="/notifications"
              className="text-xs text-[#0a7a90] font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          <ActivityFeed />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900">Earning Overview</h3>
            <Badge tone="primary">Weekly</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Your weekly earnings growth trajectory.
          </p>

          <div className="h-56 relative">
            <svg className="w-full h-full" viewBox="0 0 700 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="earnings-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a7a90" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0a7a90" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const w = 700;
                const h = 220;
                const padX = 30;
                const padY = 20;
                const innerW = w - padX * 2;
                const innerH = h - padY * 2;
                const pts = values.map((v, i) => {
                  const x = padX + (i / (values.length - 1)) * innerW;
                  const y = padY + innerH - (v / max) * innerH;
                  return [x, y];
                });
                const path = pts
                  .map(([x, y], i) =>
                    i === 0
                      ? `M ${x} ${y}`
                      : `L ${x} ${y}`
                  )
                  .join(" ");
                const areaPath = `${path} L ${padX + innerW} ${padY + innerH} L ${padX} ${padY + innerH} Z`;
                return (
                  <>
                    <path d={areaPath} fill="url(#earnings-grad)" />
                    <path
                      d={path}
                      stroke="#0a7a90"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    {pts.map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r={3} fill="#0a7a90" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="grid grid-cols-7 text-[11px] text-slate-500 mt-2">
            {labels.map((l) => (
              <div key={l} className="text-center">
                {l}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Recent Reviews</h3>
            <Link
              href="/profile?tab=reviews"
              className="text-xs text-[#0a7a90] font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">
                No reviews yet
              </div>
            ) : (
              reviews.slice(0, 2).map((r: ReviewDoc) => {
                const u =
                  typeof r.user === "object"
                    ? r.user
                    : { name: "Client", profilePhoto: undefined };
                return (
                  <div
                    key={r._id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={u.name}
                          src={u.profilePhoto}
                          size={28}
                        />
                        <div className="text-sm font-medium text-slate-900">
                          {u.name}
                        </div>
                      </div>
                      <StarRow value={r.rating || 5} />
                    </div>
                    {r.comment ? (
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {r.comment}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">
            Performance Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PerfCell
              value={(data?.stats.avgRating || 0).toFixed(1)}
              label="Average Rating"
              icon={<StarIcon size={20} filled />}
              hint="0.3 vs last week"
              up
            />
            <PerfCell
              value={`${data?.stats.repeatClientRate || 0}%`}
              label="Repeat Client Rate"
              icon={<TrendIcon size={20} />}
              hint="5% vs last week"
              up
            />
            <PerfCell
              value={`${data?.stats.refundRate || 0}%`}
              label="Refund Rate"
              icon={<ClockIcon size={20} />}
              hint="1% vs last week"
              down
            />
            <PerfCell
              value={`${Math.round(data?.stats.sessionCompletion ?? 0)}%`}
              label="Session Completion"
              icon={<ZapIcon size={20} />}
              hint="2% vs last week"
              up
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CrownIcon size={18} className="text-amber-500" />
            Advisor Tier Progress
          </h3>
          <TierProgress tier={data?.tier || "bronze"} stats={data?.stats} />
        </div>
      </div>
    </div>
  );
}

function PerfCell({
  value,
  label,
  icon,
  hint,
  up,
  down,
}: {
  value: React.ReactNode;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-amber-500">{icon}</div>
      </div>
      <div className="text-xs text-slate-700 mt-1 font-medium">{label}</div>
      {hint ? (
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            up ? "text-emerald-600" : down ? "text-red-600" : "text-slate-500"
          }`}
        >
          {up ? "↑" : down ? "↓" : ""} {hint}
        </div>
      ) : null}
    </div>
  );
}

function TierProgress({
  tier,
  stats,
}: {
  tier: string;
  stats?: DashboardData["stats"];
}) {
  const completed = stats?.completedSessions || 0;
  const tierTargets: Record<string, number> = {
    bronze: 50,
    silver: 150,
    gold: 300,
  };
  const target = tierTargets[tier] || 50;
  const pct = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mb-2">
          <AwardIcon size={36} className="text-amber-500" />
        </div>
        <div className="text-xl font-bold text-slate-900">
          {tierLabel(tier)} Advisor
        </div>
        <div className="text-xs text-slate-500 mt-1 max-w-55">
          You are doing great! Keep maintaining your performance to stay at the
          top.
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-600">
            Progress to next tier (Maintain {tierLabel(tier)})
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{pct}%</div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
          <div
            className="h-full bg-[#0a7a90]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Average Ratings</span>
            <span className="text-slate-900 font-semibold">
              {(stats?.avgRating || 0).toFixed(1)} / 4.7
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Completed Sessions</span>
            <span className="text-slate-900 font-semibold">
              {completed} / {target}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Repeat Client Rate</span>
            <span className="text-slate-900 font-semibold">
              {stats?.repeatClientRate || 0}% / 70%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Refund Rate</span>
            <span className="text-slate-900 font-semibold">
              {stats?.refundRate || 0}% / 5%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type ActivityItem = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  createdAt: string;
  data?: Record<string, unknown>;
};

// Deep-link a contract-sent activity straight to the signing page.
const activityHref = (n: ActivityItem): string | null => {
  if (n.data?.action === "sign-contract" && n.data?.contractToken) {
    return `/contract/sign?token=${encodeURIComponent(String(n.data.contractToken))}`;
  }
  return null;
};

function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<{
          items: ActivityItem[];
        }>("/notifications", { limit: 4 });
        if (!cancel) setItems(r.data?.items || []);
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (loading)
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="text-sm text-slate-500 text-center py-6">
        No recent activity
      </div>
    );

  const tone = (t: string) => {
    if (t.includes("review")) return "border-amber-400 bg-amber-50/50";
    if (t.includes("session")) return "border-sky-400 bg-sky-50/50";
    if (t.includes("booking")) return "border-emerald-400 bg-emerald-50/50";
    return "border-slate-200 bg-slate-50/50";
  };

  return (
    <div className="space-y-2">
      {items.map((n) => {
        const href = activityHref(n);
        const inner = (
          <>
            <div className="text-sm font-medium text-slate-900">{n.title}</div>
            {n.body ? (
              <div className="text-[11px] text-slate-600 line-clamp-2">
                {n.body}
              </div>
            ) : null}
          </>
        );
        const className = `block border-l-4 pl-3 pr-2 py-2 rounded-r-lg ${tone(n.type)}`;
        return href ? (
          <Link key={n._id} href={href} className={`${className} hover:brightness-95 transition`}>
            {inner}
          </Link>
        ) : (
          <div key={n._id} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
