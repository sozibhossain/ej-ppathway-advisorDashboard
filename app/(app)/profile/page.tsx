"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast";
import { fmtDate, tierLabel } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Toggle } from "../../components/ui/Input";
import {
  EyeIcon,
  CameraIcon,
  UploadIcon,
  StarIcon,
  TrashIcon,
  PencilIcon,
  ZapIcon,
  AwardIcon,
  CrownIcon,
  ClockIcon,
  TrendIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
} from "../../components/Icons";
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AdvisorProfile,
  AdvisorUser,
  PerformanceData,
  PromotionPlans,
  ReviewDoc,
} from "../../lib/types";

type TabKey =
  | "personal"
  | "expertise"
  | "pricing"
  | "reviews"
  | "performance"
  | "promotion";

const TABS: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Personal Information" },
  { key: "expertise", label: "Expertise and Certificates" },
  { key: "pricing", label: "Pricing & Availabilities" },
  { key: "reviews", label: "Reviews & Ratings" },
  { key: "performance", label: "Performance & Tier" },
  { key: "promotion", label: "Promotion Tools" },
];

const SUGGESTED_SKILLS = [
  "Love & Relationship",
  "Dream Interpretation",
  "Career",
  "Deliverance",
  "family",
  "marriage",
  "Finances",
];
const SUGGESTED_STYLES = [
  "Compassionate",
  "Direct",
  "Expressive",
  "Thoughtful",
  "Inspirational",
  "straightforward",
  "Connection",
];

export default function ProfilePage() {
  const toast = useToast();
  const { user, refreshMe } = useAuth();
  const [tab, setTab] = useState<TabKey>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [u, setU] = useState<AdvisorUser | null>(null);
  const [p, setP] = useState<AdvisorProfile | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<{ user: AdvisorUser; profile: AdvisorProfile }>(
          "/advisor/profile"
        );
        if (!cancel && r.data) {
          setU(r.data.user);
          setP(r.data.profile);
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
  }, []);

  const save = async () => {
    if (!u || !p) return;
    setSaving(true);
    try {
      await api.patch("/advisor/profile", {
        name: u.name,
        phone: u.phone,
        location: u.location,
        professionalTitle: p.professionalTitle,
        bio: p.bio,
        detailedDescription: p.detailedDescription,
        yearsOfExperience: p.yearsOfExperience,
        expertise: p.expertise,
        styles: p.styles,
        languages: p.languages,
        pricing: p.pricing,
        autoOnlineMode: p.autoOnlineMode,
        weeklySchedule: p.weeklySchedule,
      });
      toast.success("Profile saved");
      refreshMe();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Profile Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your profile, expertise and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile/preview">
            <Button variant="outline">
              <EyeIcon size={16} />
              Preview Profile
            </Button>
          </Link>
          <Button onClick={save} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 h-10 rounded-lg text-sm font-medium whitespace-nowrap ${
                tab === t.key
                  ? "bg-[#0a7a90] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "personal" && u && p && (
        <PersonalTab u={u} p={p} setU={setU} setP={setP} onProfileUpdate={refreshMe} />
      )}
      {tab === "expertise" && p && <ExpertiseTab p={p} setP={setP} />}
      {tab === "pricing" && p && <PricingTab p={p} setP={setP} />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "promotion" && <PromotionTab />}
    </div>
  );
}

function PersonalTab({
  u,
  p,
  setU,
  setP,
  onProfileUpdate,
}: {
  u: AdvisorUser;
  p: AdvisorProfile;
  setU: (next: AdvisorUser) => void;
  setP: (next: AdvisorProfile) => void;
  onProfileUpdate: () => void;
}) {
  const toast = useToast();
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [vidUploading, setVidUploading] = useState(false);

  const onUploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const r = await api.post<{ user: AdvisorUser; url: string }>(
        "/advisor/profile/photo",
        fd,
        { isFormData: true }
      );
      if (r.data?.user) setU(r.data.user);
      toast.success("Photo updated");
      onProfileUpdate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onUploadVideo = async (file: File) => {
    setVidUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const r = await api.post<{ url: string }>(
        "/advisor/application/intro-video",
        fd,
        { isFormData: true }
      );
      if (r.data?.url) setP({ ...p, introVideoUrl: r.data.url });
      toast.success("Intro video uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setVidUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 lg:col-span-1">
        <div>
          <h3 className="font-semibold text-slate-900">Profile Photo</h3>
          <div className="flex items-center gap-4 mt-3">
            <div className="relative">
              <Avatar name={u.name} src={u.profilePhoto} size={80} />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#0a7a90] text-white flex items-center justify-center"
              >
                <CameraIcon size={14} />
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadPhoto(f);
                }}
              />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => photoRef.current?.click()}
                loading={uploading}
              >
                <UploadIcon size={14} />
                Upload New Photo
              </Button>
              <div className="text-[11px] text-slate-500 mt-2">
                JPG, PNG up to 5MB
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Intro Video</h3>
          <div className="rounded-xl bg-slate-100 aspect-video mt-3 overflow-hidden flex items-center justify-center">
            {p.introVideoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={p.introVideoUrl} controls className="w-full h-full" />
            ) : (
              <div className="text-slate-500 text-sm">No intro video</div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => videoRef.current?.click()}
            loading={vidUploading}
          >
            <UploadIcon size={14} />
            Upload New Video
          </Button>
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadVideo(f);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
        <h3 className="font-semibold text-slate-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            icon={<UserIcon size={16} />}
            value={u.name}
            onChange={(v) => setU({ ...u, name: v })}
          />
          <FormInput
            label="Phone Number"
            icon={<PhoneIcon size={16} />}
            value={u.phone || ""}
            onChange={(v) => setU({ ...u, phone: v })}
          />
          <FormInput
            label="Email Address"
            icon={<MailIcon size={16} />}
            value={u.email}
            onChange={() => undefined}
            readOnly
          />
          <FormInput
            label="Location"
            icon={<MapPinIcon size={16} />}
            value={u.location || ""}
            onChange={(v) => setU({ ...u, location: v })}
          />
          <FormInput
            label="Professional Title"
            icon={<UserIcon size={16} />}
            value={p.professionalTitle || ""}
            onChange={(v) => setP({ ...p, professionalTitle: v })}
          />
          <FormInput
            label="Years of experience"
            icon={<UserIcon size={16} />}
            value={p.yearsOfExperience || ""}
            onChange={(v) => setP({ ...p, yearsOfExperience: v })}
            placeholder="e.g. 3-5 years of experience"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FormTextarea
            label="Brief Bio"
            value={p.bio || ""}
            onChange={(v) => setP({ ...p, bio: v })}
            rows={6}
          />
          <FormTextarea
            label="Detailed Description"
            value={p.detailedDescription || ""}
            onChange={(v) => setP({ ...p, detailedDescription: v })}
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}

function ExpertiseTab({
  p,
  setP,
}: {
  p: AdvisorProfile;
  setP: (next: AdvisorProfile) => void;
}) {
  const [skillInput, setSkillInput] = useState("");
  const [styleInput, setStyleInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [editLang, setEditLang] = useState<string | null>(null);
  const [editLangValue, setEditLangValue] = useState("");

  const addItem = (field: "expertise" | "styles" | "languages", v: string) => {
    if (!v.trim()) return;
    const list = (p[field] || []).slice();
    if (!list.includes(v)) list.push(v);
    setP({ ...p, [field]: list } as AdvisorProfile);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900 mb-4">Expertise & Categories</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">
            Skills/Expertise
          </h4>
          <div className="flex gap-2 mb-3">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Choose Skills & Expertise"
              className="flex-1 h-11 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("expertise", skillInput);
                  setSkillInput("");
                }
              }}
            />
          </div>
          <div className="space-y-2">
            {SUGGESTED_SKILLS.map((s) => (
              <SuggestionRow
                key={s}
                label={s}
                added={p.expertise?.includes(s)}
                onAdd={() => addItem("expertise", s)}
                onRemove={() =>
                  setP({
                    ...p,
                    expertise: (p.expertise || []).filter((x) => x !== s),
                  })
                }
              />
            ))}
            {(p.expertise || [])
              .filter((s) => !SUGGESTED_SKILLS.includes(s))
              .map((s) => (
                <SuggestionRow
                  key={s}
                  label={s}
                  added
                  onRemove={() =>
                    setP({
                      ...p,
                      expertise: (p.expertise || []).filter((x) => x !== s),
                    })
                  }
                />
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Style</h4>
          <div className="flex gap-2 mb-3">
            <input
              value={styleInput}
              onChange={(e) => setStyleInput(e.target.value)}
              placeholder="Choose Style"
              className="flex-1 h-11 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("styles", styleInput);
                  setStyleInput("");
                }
              }}
            />
          </div>
          <div className="space-y-2">
            {SUGGESTED_STYLES.map((s) => (
              <SuggestionRow
                key={s}
                label={s}
                added={p.styles?.includes(s)}
                onAdd={() => addItem("styles", s)}
                onRemove={() =>
                  setP({
                    ...p,
                    styles: (p.styles || []).filter((x) => x !== s),
                  })
                }
              />
            ))}
            {(p.styles || [])
              .filter((s) => !SUGGESTED_STYLES.includes(s))
              .map((s) => (
                <SuggestionRow
                  key={s}
                  label={s}
                  added
                  onRemove={() =>
                    setP({
                      ...p,
                      styles: (p.styles || []).filter((x) => x !== s),
                    })
                  }
                />
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">
            Languages
          </h4>
          <div className="flex gap-2 mb-3">
            <input
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              placeholder="Type your language"
              className="flex-1 h-11 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
            />
            <button
              type="button"
              onClick={() => {
                addItem("languages", langInput);
                setLangInput("");
              }}
              className="px-4 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {(p.languages || []).map((l) => (
              <div
                key={l}
                className="flex items-center justify-between bg-sky-50 rounded-lg px-3 py-2"
              >
                {editLang === l ? (
                  <input
                    autoFocus
                    value={editLangValue}
                    onChange={(e) => setEditLangValue(e.target.value)}
                    onBlur={() => {
                      const list = (p.languages || []).map((x) =>
                        x === l ? editLangValue : x
                      );
                      setP({ ...p, languages: list });
                      setEditLang(null);
                    }}
                    className="flex-1 mr-2 px-2 h-7 rounded border border-slate-200 text-sm"
                  />
                ) : (
                  <span className="text-sm text-slate-800">{l}</span>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditLang(l);
                      setEditLangValue(l);
                    }}
                    className="h-7 w-7 rounded-md bg-sky-100 text-[#0a7a90] flex items-center justify-center"
                  >
                    <PencilIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setP({
                        ...p,
                        languages: (p.languages || []).filter((x) => x !== l),
                      })
                    }
                    className="h-7 w-7 rounded-md bg-red-100 text-red-600 flex items-center justify-center"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionRow({
  label,
  added,
  onAdd,
  onRemove,
}: {
  label: string;
  added?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-sky-50 rounded-lg px-3 py-2">
      <span className="text-sm text-slate-800">{label}</span>
      {added ? (
        <button
          type="button"
          onClick={onRemove}
          className="h-7 px-3 rounded-md bg-red-100 text-red-600 text-xs font-semibold"
        >
          Remove
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="h-7 px-3 rounded-md bg-[#0a7a90] text-white text-xs font-semibold"
        >
          Add
        </button>
      )}
    </div>
  );
}

function PricingTab({
  p,
  setP,
}: {
  p: AdvisorProfile;
  setP: (next: AdvisorProfile) => void;
}) {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-8">
      <div>
        <h3 className="font-bold text-slate-900 mb-2">
          Pricing & Availabilities
        </h3>
        <h4 className="text-sm text-slate-500 mt-2 mb-3">Price per minute</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PricingInput
            label="Chat Pricing"
            value={p.pricing.chatPerMin}
            onChange={(v) =>
              setP({ ...p, pricing: { ...p.pricing, chatPerMin: v } })
            }
          />
          <PricingInput
            label="Audio Call Pricing"
            value={p.pricing.callPerMin}
            onChange={(v) =>
              setP({ ...p, pricing: { ...p.pricing, callPerMin: v } })
            }
          />
          <PricingInput
            label="Video Call Pricing"
            value={p.pricing.videoPerMin}
            onChange={(v) =>
              setP({ ...p, pricing: { ...p.pricing, videoPerMin: v } })
            }
          />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Note: You will receive 80% of earnings after platform commission
        </p>
      </div>

      <div>
        <h3 className="font-bold text-slate-900 mb-3">Availability</h3>
        <div className="bg-emerald-50/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">Auto Online Mode</div>
            <div className="text-xs text-slate-500">
              Automatically go online during your scheduled hours
            </div>
          </div>
          <Toggle
            checked={!!p.autoOnlineMode}
            onChange={(v) => setP({ ...p, autoOnlineMode: v })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          📅 Weekly Schedule
        </h3>
        <div className="space-y-2">
          {days.map((d) => {
            const sched = p.weeklySchedule?.[d] || {
              enabled: true,
              from: "09:00",
              to: "18:00",
            };
            return (
              <div
                key={d}
                className="bg-slate-50 rounded-xl p-3 flex items-center gap-4 flex-wrap"
              >
                <div className="font-semibold text-slate-900 capitalize w-28">
                  {d}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={sched.from}
                    onChange={(e) =>
                      setP({
                        ...p,
                        weeklySchedule: {
                          ...(p.weeklySchedule || {}),
                          [d]: { ...sched, from: e.target.value },
                        },
                      })
                    }
                    className="h-9 px-2 rounded-lg border border-slate-200 text-sm"
                  />
                  <span className="text-xs text-slate-500">To</span>
                  <input
                    type="time"
                    value={sched.to}
                    onChange={(e) =>
                      setP({
                        ...p,
                        weeklySchedule: {
                          ...(p.weeklySchedule || {}),
                          [d]: { ...sched, to: e.target.value },
                        },
                      })
                    }
                    className="h-9 px-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div className="ml-auto">
                  <Toggle
                    checked={!!sched.enabled}
                    onChange={(v) =>
                      setP({
                        ...p,
                        weeklySchedule: {
                          ...(p.weeklySchedule || {}),
                          [d]: { ...sched, enabled: v },
                        },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PricingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          $
        </span>
        <input
          type="number"
          min={0}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full h-11 pl-7 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
        />
      </div>
    </label>
  );
}

function ReviewsTab() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const [revRes, perfRes] = await Promise.all([
          api.get<ReviewDoc[]>(`/reviews/advisor/${user._id}`, { limit: 20 }),
          api.get<PerformanceData>("/advisor/performance"),
        ]);
        if (!cancel) {
          setReviews(revRes.data || []);
          setPerf(perfRes.data || null);
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

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  const breakdown = (perf?.ratingBreakdown || {}) as Record<string, number>;
  const total = reviews.length || 1;
  const counts = [5, 4, 3, 2, 1].map(
    (s) => reviews.filter((r) => Math.round(r.rating || 0) === s).length
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Average Rating</h3>
          <div className="text-4xl font-bold flex items-center gap-2">
            {(perf?.avgRating || 0).toFixed(1)}
            <StarIcon size={28} filled />
            <span className="text-emerald-600 text-base">
              <TrendIcon size={18} />
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Based on {reviews.length} reviews
          </div>

          <div className="mt-4 space-y-2">
            {[5, 4, 3, 2, 1].map((s, idx) => {
              const c = counts[idx];
              const pct = total > 0 ? (c / total) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-700 w-6">
                    {s}
                  </div>
                  <StarIcon size={14} filled />
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a7a90]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-600 w-10 text-right">
                    {pct.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Performance Highlights
          </h3>
          <div className="space-y-3">
            {[
              ["communication", "Communication"],
              ["expertise", "Expertise"],
              ["professionalism", "Professionalism"],
              ["valueForMoney", "Value for Money"],
            ].map(([k, label]) => {
              const v = (breakdown[k] || 0) * 20;
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="text-sm text-slate-700 w-32">{label}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a7a90]"
                      style={{ width: `${Math.min(100, v)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-700 w-10 text-right font-semibold">
                    {Math.round(v)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            No reviews yet
          </div>
        ) : (
          reviews.map((r) => {
            const u =
              typeof r.user === "object"
                ? r.user
                : { name: "Client", profilePhoto: undefined };
            return (
              <div
                key={r._id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} src={u.profilePhoto} size={40} />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">
                      {u.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <StarIcon
                          key={i}
                          size={12}
                          filled={i <= Math.round(r.rating || 0)}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {r.session && typeof r.session === "object"
                        ? `${r.session.type || "Chat"} Session`
                        : "Session"}{" "}
                      · {fmtDate(r.createdAt)}
                    </div>
                  </div>
                </div>
                {r.comment ? (
                  <p className="text-sm text-slate-700 mt-3">{r.comment}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PerformanceTab() {
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<PerformanceData>("/advisor/performance");
        if (!cancel) setPerf(r.data || null);
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

  if (loading || !perf)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  const totalRet =
    (perf.retention?.["1-3"] || 0) +
    (perf.retention?.["4-9"] || 0) +
    (perf.retention?.["10+"] || 0);
  const ret = (k: keyof PerformanceData["retention"]) => {
    const c = perf.retention?.[k] || 0;
    return totalRet > 0 ? Math.round((c / totalRet) * 100) : 0;
  };

  const breakdown = (perf.ratingBreakdown || {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerfCard
          tone="amber"
          icon={<StarIcon size={20} filled />}
          label="AVG Ratings"
          value={(perf.avgRating || 0).toFixed(1)}
        />
        <PerfCard
          tone="emerald"
          icon={<TrendIcon size={20} />}
          label="Repeat Rate"
          value={`${perf.repeatRate || 0}%`}
        />
        <PerfCard
          tone="violet"
          icon={<ClockIcon size={20} />}
          label="AVG Response"
          value={`${Math.round((perf.avgResponseSec || 60) / 60)}m`}
        />
        <PerfCard
          tone="emerald"
          icon={<TrendIcon size={20} />}
          label="Refund Rate"
          value={`${perf.refundRate || 0}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Rating Breakdown</h3>
          <div className="space-y-3">
            {[
              ["accuracy", "Accuracy"],
              ["clarity", "Clarity"],
              ["helpfulness", "Helpfulness"],
              ["valuable", "Valuable"],
            ].map(([k, label]) => {
              const v = (breakdown[k] || 0) * 20;
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="text-sm text-slate-700 w-32">{label}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a7a90]"
                      style={{ width: `${Math.min(100, v)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-700 font-semibold w-10 text-right">
                    {Math.round(v)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-2">Client Retention</h3>
          <div className="text-center py-2">
            <div className="text-4xl font-bold text-slate-900">
              {perf.repeatRate || 0}%
            </div>
            <div className="text-xs text-slate-500">
              of clients return for more sessions
            </div>
          </div>
          <div className="space-y-3 mt-3">
            {[
              ["1-3", "1-3 sessions"],
              ["4-9", "4-9 sessions"],
              ["10+", "10+ sessions"],
            ].map(([k, label]) => {
              const v = ret(k as keyof PerformanceData["retention"]);
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="text-sm text-slate-700 w-28">{label}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a7a90]"
                      style={{ width: `${Math.min(100, v)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-700 font-semibold w-10 text-right">
                    {v}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CrownIcon size={18} className="text-amber-500" />
          Tier System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["bronze", "silver", "gold"] as const).map((t) => {
            const cfg =
              perf.tierConfig?.[t] || {
                sessions:
                  t === "bronze"
                    ? 50
                    : t === "silver"
                      ? 150
                      : 300,
                rating:
                  t === "bronze" ? 4 : t === "silver" ? 4.5 : 4.8,
                retention:
                  t === "bronze" ? 70 : t === "silver" ? 80 : 85,
              };
            const isCurrent = perf.tier === t;
            return (
              <div
                key={t}
                className={`rounded-2xl border-2 p-5 relative ${
                  t === "bronze"
                    ? "bg-orange-50 border-orange-200"
                    : t === "silver"
                      ? "bg-slate-50 border-slate-200"
                      : "bg-amber-50 border-amber-200"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-full px-3 py-1 inline-flex items-center gap-1">
                    <CrownIcon size={10} />
                    Current Tier
                  </span>
                )}
                <div className="flex justify-center mb-3">
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center ${
                      t === "bronze"
                        ? "bg-orange-200 text-orange-700"
                        : t === "silver"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-amber-200 text-amber-700"
                    }`}
                  >
                    <AwardIcon size={28} />
                  </div>
                </div>
                <div className="text-xl font-bold text-center text-slate-900">
                  {tierLabel(t)}
                </div>
                <div className="border-t border-slate-200 my-3" />
                <div className="text-sm text-slate-700 space-y-1">
                  <Row k="Sessions" v={`${cfg.sessions}+`} />
                  <Row k="Ratings" v={`${cfg.rating}+`} />
                  <Row k="Retention" v={`${cfg.retention}%+`} />
                </div>
                <div className="text-xs text-slate-500 mt-3">Benefits:</div>
                <ul className="text-xs text-slate-700 list-disc pl-4 mt-1 space-y-0.5">
                  {t === "bronze" && (
                    <>
                      <li>Basic profile visibility</li>
                      <li>Standard support</li>
                    </>
                  )}
                  {t === "silver" && (
                    <>
                      <li>Enhanced profile visibility</li>
                      <li>Priority support</li>
                      <li>Profile badge</li>
                    </>
                  )}
                  {t === "gold" && (
                    <>
                      <li>Maximum visibility</li>
                      <li>Featured placement</li>
                      <li>VIP support</li>
                      <li>Gold badge</li>
                      <li>Reduced commission</li>
                    </>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}

function PerfCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: "amber" | "emerald" | "violet";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const cls: Record<string, string> = {
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    violet: "bg-violet-50 border-violet-100",
  };
  return (
    <div className={`rounded-2xl border p-4 ${cls[tone]}`}>
      <div className="h-9 w-9 rounded-lg bg-white text-amber-500 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-[10px] uppercase font-semibold text-slate-500 mt-3 tracking-wider">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function PromotionTab() {
  const toast = useToast();
  const [plans, setPlans] = useState<PromotionPlans | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [active, setActive] = useState<{
    plan: string;
    expiresAt: string;
    impressions?: number;
    profileViews?: number;
    clicks?: number;
    newClients?: number;
  } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [plansRes, profRes] = await Promise.all([
          api.get<PromotionPlans>("/advisor/promotion-plans"),
          api.get<{ profile: AdvisorProfile }>("/advisor/profile"),
        ]);
        if (!cancel) {
          setPlans(plansRes.data || null);
          const ap = profRes.data?.profile?.activePromotion;
          if (ap?.plan) {
            setActive({
              plan: ap.plan,
              expiresAt: ap.expiresAt || "",
              impressions: ap.impressions,
              profileViews: ap.profileViews,
              clicks: ap.clicks,
              newClients: ap.newClients,
            });
          }
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
  }, []);

  const activate = async (plan: string) => {
    setActivating(plan);
    try {
      const r = await api.post<{
        plan: string;
        expiresAt: string;
        impressions: number;
      }>("/advisor/promotion/activate", { plan });
      if (r.data) setActive({ plan: r.data.plan, expiresAt: r.data.expiresAt });
      toast.success("Promotion activated");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Activation failed");
    } finally {
      setActivating(null);
    }
  };

  if (loading || !plans)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  const planCards = [
    { key: "basic", title: "Basic Boost", price: plans.basic?.price ?? 29, days: plans.basic?.days ?? 7, tone: "emerald", features: ["2x profile visibility", "100 impressions/day", "Standard placement"] },
    { key: "pro", title: "Pro Featured", price: plans.pro?.price ?? 79, days: plans.pro?.days ?? 14, tone: "violet", features: ["5x profile visibility", "500 impressions/day", "Featured in category", "Top of search results"] },
    { key: "premium", title: "Premium Spotlight", price: plans.premium?.price ?? 149, days: plans.premium?.days ?? 30, tone: "amber", features: ["10x profile visibility", "Unlimited impressions", "Homepage featured", "Top search placement", "Social media promotion"] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Boost Your Visibility</h2>
        <p className="text-sm text-slate-500 mt-1">
          Increase your profile visibility and get more clients with our
          promotion tools
        </p>
      </div>

      {active && (
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-slate-900">Active Promotion</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              Active
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Plan</div>
              <div className="font-bold text-slate-900 capitalize">
                {active.plan === "pro" ? "Pro Featured" : tierLabel(active.plan)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Expires</div>
              <div className="font-bold text-slate-900">
                {fmtDate(active.expiresAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Impressions</div>
              <div className="font-bold text-slate-900">
                {active.impressions || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">New Clients</div>
              <div className="font-bold text-slate-900">
                +{active.newClients || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planCards.map((p) => {
          const isActive = active?.plan === p.key;
          const isPopular = p.key === "pro";
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border p-5 ${
                p.tone === "violet"
                  ? "bg-violet-50 border-violet-200"
                  : p.tone === "amber"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-700 text-white text-[10px] font-bold uppercase rounded-full px-3 py-1 inline-flex items-center gap-1">
                  <CrownIcon size={10} />
                  Most Popular
                </span>
              )}
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                  p.tone === "violet"
                    ? "bg-violet-200 text-violet-700"
                    : p.tone === "amber"
                      ? "bg-amber-200 text-amber-700"
                      : "bg-emerald-200 text-emerald-700"
                }`}
              >
                <ZapIcon size={22} />
              </div>
              <div className="text-xl font-bold text-slate-900">{p.title}</div>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-bold text-slate-900">
                  ${p.price}
                </span>
                <span className="text-xs text-slate-500">/{p.days} days</span>
              </div>
              <ul className="text-sm text-slate-700 space-y-1.5 mb-4">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!!activating || isActive}
                onClick={() => activate(p.key)}
                className={`w-full h-11 rounded-lg font-semibold text-sm ${
                  p.key === "pro"
                    ? "bg-[#0a7a90] text-white hover:bg-[#076377]"
                    : p.key === "premium"
                      ? "bg-white text-amber-700 border border-amber-300 hover:bg-amber-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                } disabled:opacity-50`}
              >
                {isActive
                  ? "Active"
                  : activating === p.key
                    ? "Activating…"
                    : "Activate Boost"}
              </button>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">
            Promotion Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#0a7a90]">
                {active.impressions || 0}
              </div>
              <div className="text-xs text-slate-500">Total Impressions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {active.profileViews || 0}
              </div>
              <div className="text-xs text-slate-500">Profile Views</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {active.clicks || 0}
              </div>
              <div className="text-xs text-slate-500">Click Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-violet-600">
                +{active.newClients || 0}
              </div>
              <div className="text-xs text-slate-500">New Bookings</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        ) : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full h-11 ${icon ? "pl-10" : "pl-4"} pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20 ${
            readOnly ? "bg-slate-50" : ""
          }`}
        />
      </div>
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20 resize-none"
      />
    </label>
  );
}
