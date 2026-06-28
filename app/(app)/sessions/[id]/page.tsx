"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import { useToast } from "../../../lib/toast";
import { fmtDateTime, fmtMinutes, fmtCredits } from "../../../lib/format";
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

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

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
                {session.type} Session
                <span>·</span>
                <span>{fmtCredits(session.ratePerMin)}/min</span>
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
            label="Duration"
            value={fmtMinutes(session.durationMinutes || 0)}
          />
          <Stat label="Estimated Cost" value={fmtCredits(session.estimatedCost)} />
          <Stat label="Charged" value={fmtCredits(session.chargedAmount)} />
        </div>

        {session.advisorNotes ? (
          <div className="mt-6">
            <div className="text-xs text-slate-500 mb-1">Notes</div>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {session.advisorNotes}
            </p>
          </div>
        ) : null}

        <div className="flex gap-2 mt-6 flex-wrap">
          {session.status === "live" ? (
            <Link href={`/sessions/${session._id}/live`}>
              <Button>Open Live Session</Button>
            </Link>
          ) : null}

          {(session.status === "pending" ||
            session.status === "consent" ||
            session.status === "waiting") && (
            <Button onClick={onStart} loading={working}>
              Start Session
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "info" | "success" | "danger" | "warning" | "neutral"; label: string }> = {
    pending: { tone: "warning", label: "Pending" },
    consent: { tone: "warning", label: "Consent" },
    waiting: { tone: "info", label: "Waiting" },
    live: { tone: "success", label: "Live" },
    completed: { tone: "success", label: "Completed" },
    cancelled: { tone: "danger", label: "Cancelled" },
    no_show: { tone: "danger", label: "No Show" },
    flagged: { tone: "danger", label: "Flagged" },
    disputed: { tone: "warning", label: "Disputed" },
  };
  const m = map[status] || { tone: "neutral" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
