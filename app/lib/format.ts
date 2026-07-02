export const fmtCredits = (n: number | undefined | null) => {
  const v = Math.round(Number(n) || 0);
  return `${v} credits`;
};

export const fmtCurrency = (n: number | undefined | null) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
};

export const fmtNumber = (n: number | undefined | null) => {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
};

export const fmtDate = (iso?: string | Date | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(iso);
  }
};

export const fmtDateTime = (iso?: string | Date | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

export const fmtTime = (iso?: string | Date | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
};

export const fmtDuration = (sec: number | undefined | null) => {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

type SessionTiming = {
  scheduledFor?: string | Date | null;
  startedAt?: string | Date | null;
  durationMinutes?: number | null;
  status?: string | null;
};

const toMs = (value?: string | Date | null) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const sessionRemainingSeconds = (
  session: SessionTiming,
  now: Date = new Date()
) => {
  const durationMinutes = Number(session.durationMinutes || 0);
  const startMs = toMs(session.startedAt || session.scheduledFor);
  if (!startMs || durationMinutes <= 0) return 0;
  const endMs = startMs + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - now.getTime()) / 1000));
};

export const isSessionTimeActive = (
  session: SessionTiming,
  now: Date = new Date()
) => {
  if (session.status && ["completed", "cancelled", "expired", "no_show"].includes(session.status)) {
    return false;
  }
  const startMs = toMs(session.startedAt || session.scheduledFor);
  return !!startMs && startMs <= now.getTime() && sessionRemainingSeconds(session, now) > 0;
};

export const fmtSessionTimeLeft = (
  session: SessionTiming,
  now: Date = new Date()
) => fmtDuration(sessionRemainingSeconds(session, now));

export const fmtMinutes = (mins: number | undefined | null) => {
  const m = Math.max(0, Math.floor(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return `${h}h ${r}m`;
};

export const initials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
};

export const tierLabel = (tier?: string) => {
  if (!tier) return "Bronze";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};
