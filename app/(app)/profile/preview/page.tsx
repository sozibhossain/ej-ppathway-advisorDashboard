"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { fmtDate, tierLabel } from "../../../lib/format";
import { Avatar } from "../../../components/ui/Avatar";
import { DetailSkeleton } from "../../../components/ui/Skeleton";
import { Toggle } from "../../../components/ui/Input";
import {
  ArrowLeftIcon,
  StarIcon,
  AwardIcon,
  TrendIcon,
  ChatIcon,
  PhoneIcon,
  VideoIcon,
} from "../../../components/Icons";
import type {
  AdvisorProfile,
  AdvisorUser,
  ReviewDoc,
} from "../../../lib/types";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isAudioMediaUrl(url: string) {
  return /\.(aac|aiff|flac|m4a|mp3|ogg|opus|wav)(\?|#|$)/i.test(url);
}

export default function PreviewProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const credits = (value?: number) => `${Number(value || 0).toFixed(2)} credits`;
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [u, setU] = useState<AdvisorUser | null>(null);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const [profRes, revRes] = await Promise.all([
          api.get<{ user: AdvisorUser; profile: AdvisorProfile }>(
            "/advisor/profile"
          ),
          api.get<ReviewDoc[]>(`/reviews/advisor/${user._id}`, { limit: 20 }),
        ]);
        if (!cancel) {
          setU(profRes.data?.user || null);
          setProfile(profRes.data?.profile || null);
          setReviews(revRes.data || []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  if (loading || !profile || !u) return <DetailSkeleton />;

  const total = reviews.length || 1;
  const counts = [5, 4, 3, 2, 1].map(
    (s) => reviews.filter((r) => Math.round(r.rating || 0) === s).length
  );
  const breakdown = profile.ratingBreakdown || {};

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <div className="flex-1 text-center font-semibold text-[#0a7a90]">
          Preview your Profile
        </div>
        <div className="w-9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <Avatar name={u.name} src={u.profilePhoto} size={56} />
              <div className="flex-1">
                <div className="text-xl font-bold text-slate-900">{u.name}</div>
                <div className="text-sm text-slate-600">
                  {profile.professionalTitle}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <StarIcon size={12} filled />
                  {(profile.avgRating || 0).toFixed(1)} ({reviews.length}{" "}
                  reviews)
                </div>
              </div>
              <div className="text-right">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-1">
                  <AwardIcon size={24} className="text-amber-500" />
                </div>
                <div className="font-bold text-amber-700 text-sm">
                  {tierLabel(profile.tier)} Advisor
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-2">Basic Information</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {profile.detailedDescription || profile.bio || "—"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">
              Expertise & Categories
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Column title="Skills/Expertise" items={profile.expertise} />
              <Column title="Styles" items={profile.styles} />
              <Column title="Languages" items={profile.languages} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Availability</h3>
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">
                  Auto Online Mode
                </div>
                <div className="text-xs text-slate-500">
                  Automatically go online during your scheduled hours
                </div>
              </div>
              <Toggle
                checked={!!profile.autoOnlineMode}
                onChange={() => undefined}
                disabled
              />
            </div>
            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                📅 Weekly Schedule
              </div>
              <div className="space-y-1.5 text-sm">
                {days.map((d) => {
                  const sched = profile.weeklySchedule?.[d];
                  return (
                    <div
                      key={d}
                      className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <span className="capitalize text-slate-700">{d}</span>
                      <span className="text-[#0a7a90] font-semibold">
                        {sched?.enabled
                          ? `${sched.from} - ${sched.to}`
                          : "Off"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Reviews & Ratings</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-semibold text-slate-900 mb-2">
                  Average Rating
                </div>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {(profile.avgRating || 0).toFixed(1)}
                  <StarIcon size={24} filled />
                  <TrendIcon size={16} className="text-emerald-600" />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Based on {reviews.length} reviews
                </div>
                <div className="space-y-1 mt-3">
                  {[5, 4, 3, 2, 1].map((s, idx) => {
                    const c = counts[idx];
                    const pct = (c / total) * 100;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-700 w-4">
                          {s}
                        </div>
                        <StarIcon size={10} filled />
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0a7a90]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-600 w-8 text-right">
                          {pct.toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-semibold text-slate-900 mb-2">
                  Performance Highlights
                </div>
                <div className="space-y-2">
                  {[
                    ["communication", "Communication"],
                    ["expertise", "Expertise"],
                    ["professionalism", "Professionalism"],
                    ["valueForMoney", "Value for Money"],
                  ].map(([k, label]) => {
                    const v =
                      ((breakdown as Record<string, number>)[k] || 0) * 20;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <div className="text-xs text-slate-700 w-24">
                          {label}
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0a7a90]"
                            style={{ width: `${Math.min(100, v)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-700 w-8 text-right font-semibold">
                          {Math.round(v)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {reviews.slice(0, 6).map((r) => {
                const ru =
                  typeof r.user === "object"
                    ? r.user
                    : { name: "Client", profilePhoto: undefined };
                return (
                  <div
                    key={r._id}
                    className="border border-slate-200 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={ru.name} src={ru.profilePhoto} size={28} />
                      <div className="font-semibold text-sm">{ru.name}</div>
                      <div className="ml-2 flex">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <StarIcon
                            key={i}
                            size={10}
                            filled={i <= Math.round(r.rating || 0)}
                          />
                        ))}
                      </div>
                      <div className="ml-auto text-[11px] text-slate-500">
                        {fmtDate(r.createdAt)}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-600">{r.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {profile.introVideoUrl ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-3">Intro media</h3>
              <div className="rounded-xl overflow-hidden aspect-video bg-slate-100">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                {isAudioMediaUrl(profile.introVideoUrl) ? (
                  <div className="flex h-full items-center px-4">
                    <audio src={profile.introVideoUrl} controls className="w-full" />
                  </div>
                ) : (
                  <video
                    src={profile.introVideoUrl}
                    controls
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-emerald-600">Cr</span> Credit Pricing
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 inline-flex items-center gap-2">
                  <ChatIcon size={14} className="text-[#0a7a90]" /> Chat
                </span>
                <span className="font-bold text-slate-900">
                  {credits(profile.pricing.chatPerMin)}/min
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 inline-flex items-center gap-2">
                  <PhoneIcon size={14} className="text-[#0a7a90]" /> Call
                </span>
                <span className="font-bold text-slate-900">
                  {credits(profile.pricing.callPerMin)}/min
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 inline-flex items-center gap-2">
                  <VideoIcon size={14} className="text-[#0a7a90]" /> Video
                </span>
                <span className="font-bold text-slate-900">
                  {credits(profile.pricing.videoPerMin)}/min
                </span>
              </div>
            </div>
            <button
              type="button"
              className="mt-4 w-full h-11 rounded-lg bg-[#0a7a90] text-white font-semibold disabled:opacity-50"
              disabled
            >
              Book a session
            </button>
            <button
              type="button"
              className="mt-2 w-full h-11 rounded-lg bg-slate-100 text-slate-700 font-semibold disabled:opacity-50"
              disabled
            >
              Send message
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Preview only — clients see this layout when booking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-700 mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items?.map((s) => (
          <div
            key={s}
            className="bg-sky-50 rounded-md text-sm text-slate-800 px-3 py-1.5"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
