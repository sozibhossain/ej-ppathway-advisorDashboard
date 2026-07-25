"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import { useToast } from "../../../lib/toast";
import {
  fmtDateTime,
  fmtDuration,
  fmtMinutes,
  fmtSessionTimeLeft,
  isSessionTimeActive,
} from "../../../lib/format";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { DetailSkeleton } from "../../../components/ui/Skeleton";
import { Badge } from "../../../components/ui/Badge";
import {
  ArrowLeftIcon,
  ChatIcon,
  PhoneIcon,
  VideoIcon,
} from "../../../components/Icons";
import type { SessionDoc } from "../../../lib/types";

const populated = (
  ref: SessionDoc["user"] | SessionDoc["advisor"]
): { _id: string; name: string; profilePhoto?: string } => {
  if (!ref || typeof ref === "string") return { _id: "", name: "Client" };
  return ref;
};

const sessionDurationLabel = (session: SessionDoc) => {
  if (session.status === "completed" && session.actualDurationSec && session.actualDurationSec > 0) {
    return fmtDuration(session.actualDurationSec);
  }
  return fmtMinutes(session.durationMinutes || 0);
};

const actualDurationLabel = (session: SessionDoc) => {
  if (session.actualDurationSec && session.actualDurationSec > 0) {
    return fmtDuration(session.actualDurationSec);
  }
  if (session.status === "completed") return "00:00:00";
  return "-";
};

const sessionTypeLabel = (type: SessionDoc["type"]) => {
  if (type === "call") return "Audio Call";
  if (type === "video") return "Video Call";
  return "Text Chat";
};

const yesNo = (value?: boolean) => (value ? "Yes" : "No");

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<SessionDoc>(`/sessions/${id}`);
        if (!cancel) setSession(r.data || null);
      } catch (e) {
        const m = e instanceof ApiError ? e.message : "Failed to load session";
        toast.error(m);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, toast]);

  const onStart = async () => {
    if (!session) return;
    setWorking(true);
    try {
      const r = await api.post<SessionDoc>(`/sessions/${session._id}/advisor/start`);
      if (r.data) setSession(r.data);
      router.push(`/sessions/${session._id}/live`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to start");
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!session)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <p className="text-slate-500">Session not found</p>
        <Link
          href="/sessions"
          className="text-[#0a7a90] hover:underline text-sm mt-2 inline-block"
        >
          Back to sessions
        </Link>
      </div>
    );

  const u = populated(session.user);
  const TypeIcon =
    session.type === "video"
      ? VideoIcon
      : session.type === "call"
        ? PhoneIcon
        : ChatIcon;
  const showTimeLeft = isSessionTimeActive(session, now);
  const typeLabel = sessionTypeLabel(session.type);
  const hasReview = Boolean(session.review || session.rating);
  const showIssueDetails = Boolean(session.cancelReason || session.status === "cancelled" || session.status === "no_show" || session.status === "expired");

  return (
    <div className="space-y-6 w-full">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeftIcon size={16} />
        Go Back
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} src={u.profilePhoto} size={64} />
            <div>
              <div className="text-xl font-bold text-slate-900">{u.name}</div>
              <div className="text-sm text-slate-500 capitalize flex items-center gap-2">
                <TypeIcon size={14} />
                {typeLabel}
              </div>
              <div className="mt-1">
                <StatusBadge status={session.status} />
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Session Code</div>
            <div className="font-mono font-semibold text-slate-800">
              {session.sessionCode || session._id.slice(-6).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Stat label="Scheduled For" value={fmtDateTime(session.scheduledFor)} />
          <Stat
            label={showTimeLeft ? "Time Left" : "Duration"}
            value={
              showTimeLeft
                ? fmtSessionTimeLeft(session, now)
                : sessionDurationLabel(session)
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <DetailCard label="Client" value={u.name} />
          <DetailCard label="Session Type" value={typeLabel} />
          <DetailCard label="Session Status" value={<StatusBadge status={session.status} />} />
          <DetailCard label="Booked Duration" value={fmtMinutes(session.durationMinutes || 0)} />
          <DetailCard label="Actual Duration" value={actualDurationLabel(session)} />
          <DetailCard
            label="Rating"
            value={session.rating ? `${session.rating.toFixed(1)} / 5` : "Not rated"}
          />
          <DetailCard label="Started At" value={fmtDateTime(session.startedAt)} />
          <DetailCard label="Ended At" value={fmtDateTime(session.endedAt)} />
          <DetailCard label="Recording Consent" value={yesNo(session.recordingConsented)} />
          <DetailCard label="Instant Booking" value={yesNo(session.instantStart)} />
          <DetailCard label="Created At" value={fmtDateTime(session.createdAt)} />
          <DetailCard label="Last Updated" value={fmtDateTime(session.updatedAt)} />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Session Timeline</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <TimelineStep label="Booked" value={fmtDateTime(session.createdAt)} />
            <TimelineStep label="Scheduled" value={fmtDateTime(session.scheduledFor)} />
            <TimelineStep label="Started" value={fmtDateTime(session.startedAt)} />
            <TimelineStep label="Ended" value={fmtDateTime(session.endedAt)} />
          </div>
        </div>

        {session.advisorNotes ? (
          <div className="mt-6">
            <div className="text-xs text-slate-500 mb-1">Advisor Notes</div>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {session.advisorNotes}
            </p>
          </div>
        ) : null}

        {hasReview ? (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-500 mb-1">Client Review</div>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {session.review || "No written review submitted"}
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {session.rating ? `${session.rating.toFixed(1)} / 5` : "Not rated"}
              </div>
            </div>
          </div>
        ) : null}

        {showIssueDetails ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs text-amber-700 mb-1">Session Note</div>
            <p className="text-sm font-medium text-amber-900">
              {session.cancelReason || `Session marked as ${session.status.replace("_", " ")}.`}
            </p>
          </div>
        ) : null}

        <div className="flex gap-2 mt-6 flex-wrap">
          {session.status === "live" ? (
            <Link href={`/sessions/${session._id}/live`}>
              <Button>Open Live Session - {fmtSessionTimeLeft(session, now)}</Button>
            </Link>
          ) : null}

          {(session.status === "pending" ||
            session.status === "consent" ||
            session.status === "waiting") && (
            <Button onClick={onStart} loading={working}>
              {showTimeLeft
                ? `Start Session - ${fmtSessionTimeLeft(session, now)}`
                : "Start Session"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 min-h-[86px]">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-2 break-words">
        {value || "-"}
      </div>
    </div>
  );
}

function TimelineStep({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#0a7a90]" />
        <span className="text-xs font-semibold text-slate-600">{label}</span>
      </div>
      <div className="text-sm font-medium text-slate-900 mt-2 pl-4">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "info" | "success" | "danger" | "warning" | "neutral"; label: string }> = {
    pending: { tone: "warning", label: "Pending" },
    consent: { tone: "warning", label: "Consent" },
    waiting: { tone: "info", label: "Waiting" },
    live: { tone: "success", label: "Live" },
    completed: { tone: "success", label: "Completed" },
    cancelled: { tone: "danger", label: "Cancelled" },
    expired: { tone: "neutral", label: "Expired" },
    no_show: { tone: "danger", label: "No Show" },
    flagged: { tone: "danger", label: "Flagged" },
    disputed: { tone: "warning", label: "Disputed" },
  };
  const m = map[status] || { tone: "neutral" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
