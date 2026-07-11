"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast";
import { fmtDate, tierLabel } from "../../lib/format";
import { useCountries, useCities } from "../../lib/countries";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { CardSkeleton, DetailSkeleton } from "../../components/ui/Skeleton";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "../../components/Icons";
import { Combobox } from "../../components/ui/Combobox";
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AdvisorProfile,
  AdvisorUser,
  DateAvailability,
  DaySchedule,
  PerformanceData,
  PromotionPlans,
  ReviewDoc,
  ScheduleSlot,
} from "../../lib/types";

type TabKey =
  | "personal"
  | "pricing"
  | "performance"
  | "promotion";

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

function isAudioMediaUrl(url: string) {
  return /\.(aac|aiff|flac|m4a|mp3|ogg|opus|wav)(\?|#|$)/i.test(url);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropImageToSquare(file: File, zoom: number) {
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");

    const cropSize = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    const sx = (img.naturalWidth - cropSize) / 2;
    const sy = (img.naturalHeight - cropSize) / 2;
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not crop image"))),
        "image/jpeg",
        0.92
      );
    });
    return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(src);
  }
}

function normalizeProfileForEdit(profile: AdvisorProfile) {
  return {
    ...profile,
    pricing: {
      ...profile.pricing,
      chatPerMin: Number(profile.pricing?.chatPerMin ?? 0),
      callPerMin: Number(profile.pricing?.callPerMin ?? 0),
      videoPerMin: Number(profile.pricing?.videoPerMin ?? 0),
    },
    autoOnlineMode: !!profile.autoOnlineMode,
    weeklySchedule: Object.fromEntries(
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((day) => [
        day,
        normalizeDaySchedule(profile.weeklySchedule?.[day]),
      ]),
    ),
    dateAvailability: normalizeDateAvailability(profile.dateAvailability),
  };
}

function normalizeDaySchedule(schedule?: Partial<DaySchedule>): DaySchedule {
  const fallback = { from: "09:00", to: "18:00" };
  const slots = Array.isArray(schedule?.slots) && schedule.slots.length
    ? schedule.slots
    : [{ from: schedule?.from || fallback.from, to: schedule?.to || fallback.to }];
  const cleanSlots = slots.map(normalizeSlot).filter((slot) => slot.from && slot.to);
  const first = cleanSlots[0] || fallback;
  return {
    enabled: !!schedule?.enabled,
    from: first.from,
    to: first.to,
    slots: cleanSlots.length ? cleanSlots : [fallback],
  };
}

function normalizeSlot(slot: Partial<ScheduleSlot>): ScheduleSlot {
  return {
    from: slot.from || "09:00",
    to: slot.to || "18:00",
  };
}

function normalizeDateAvailability(
  value?: Record<string, Partial<DateAvailability>>,
) {
  const normalized: Record<string, DateAvailability> = {};
  for (const [date, schedule] of Object.entries(value || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const slots = (schedule.slots || [])
      .map(normalizeSlot)
      .filter((slot) => slot.from && slot.to);
    normalized[date] = {
      unavailable: schedule.unavailable === true,
      slots: schedule.unavailable === true ? [] : slots,
    };
  }
  return normalized;
}

function setDaySchedule(
  p: AdvisorProfile,
  setP: (next: AdvisorProfile) => void,
  day: string,
  schedule: DaySchedule,
) {
  const normalized = normalizeDaySchedule(schedule);
  setP({
    ...p,
    weeklySchedule: {
      ...(p.weeklySchedule || {}),
      [day]: normalized,
    },
  });
}

function tabFromQuery(value: string | null): TabKey {
  if (value === "pricing") return "pricing";
  if (value === "reviews") return "performance";
  if (value === "promotion") return "promotion";
  return "personal";
}

function profileHeading(tab: TabKey) {
  if (tab === "pricing") {
    return {
      title: "Pricing",
      description: "Manage your session rates and availability settings.",
    };
  }
  if (tab === "performance") {
    return {
      title: "Reviews",
      description: "Review client feedback and performance metrics.",
    };
  }
  if (tab === "promotion") {
    return {
      title: "Promotion Tools",
      description: "Boost your advisor profile and track campaign visibility.",
    };
  }
  return {
    title: "Profile Management",
    description: "Manage your profile, expertise and pricing",
  };
}

export default function ProfilePage() {
  const toast = useToast();
  const { user, refreshMe } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(tabFromQuery(searchParams.get("tab")));
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
          setP(normalizeProfileForEdit(r.data.profile));
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

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get("tab")));
  }, [searchParams]);

  const save = async () => {
    if (!u || !p) return;
    setSaving(true);
    try {
      const browserTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await api.patch("/advisor/profile", {
        name: u.name,
        phone: u.phone,
        country: u.country,
        city: u.city,
        timezone:
          u.timezone && u.timezone !== "UTC" ? u.timezone : browserTimezone,
        professionalTitle: p.professionalTitle,
        bio: p.bio,
        yearsOfExperience: p.yearsOfExperience,
        expertise: p.expertise,
        styles: p.styles,
        languages: p.languages,
        pricing: p.pricing,
        autoOnlineMode: p.autoOnlineMode,
        weeklySchedule: p.weeklySchedule,
        dateAvailability: p.dateAvailability,
      });
      toast.success(res.message || "Profile saved");
      refreshMe();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <DetailSkeleton />
        <CardSkeleton />
      </div>
    );

  const heading = profileHeading(tab);
  const canSave = tab === "personal" || tab === "pricing";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {heading.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {heading.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "personal" ? (
          <Link href="/profile/preview">
            <Button variant="outline">
              <EyeIcon size={16} />
              Preview Profile
            </Button>
          </Link>
          ) : null}
          {canSave ? (
          <Button onClick={save} loading={saving}>
            Save Changes
          </Button>
          ) : null}
        </div>
      </div>

      {tab === "personal" && u && p && (
        <div className="space-y-6">
          <PersonalTab u={u} p={p} setU={setU} setP={setP} onProfileUpdate={refreshMe} />
          <ExpertiseTab p={p} setP={setP} />
        </div>
      )}
      {tab === "pricing" && p && <PricingTab p={p} setP={setP} />}
      {tab === "performance" && (
        <div className="space-y-6">
          <PerformanceTab />
          <ReviewsTab />
        </div>
      )}
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
  const countries = useCountries();
  const cities = useCities(u.country);
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [vidUploading, setVidUploading] = useState(false);
  const [photoCropFile, setPhotoCropFile] = useState<File | null>(null);
  const [photoCropPreview, setPhotoCropPreview] = useState("");
  const [photoCropZoom, setPhotoCropZoom] = useState(1);

  useEffect(() => {
    return () => {
      if (photoCropPreview) URL.revokeObjectURL(photoCropPreview);
    };
  }, [photoCropPreview]);

  const openPhotoCrop = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (photoCropPreview) URL.revokeObjectURL(photoCropPreview);
    setPhotoCropFile(file);
    setPhotoCropPreview(URL.createObjectURL(file));
    setPhotoCropZoom(1);
  };

  const closePhotoCrop = () => {
    if (photoCropPreview) URL.revokeObjectURL(photoCropPreview);
    setPhotoCropFile(null);
    setPhotoCropPreview("");
    setPhotoCropZoom(1);
    if (photoRef.current) photoRef.current.value = "";
  };

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

  const uploadCroppedPhoto = async () => {
    if (!photoCropFile) return;
    try {
      const cropped = await cropImageToSquare(photoCropFile, photoCropZoom);
      closePhotoCrop();
      await onUploadPhoto(cropped);
    } catch {
      toast.error("Could not crop image");
    }
  };

  const onUploadIntroMedia = async (file: File, expectedType: "audio" | "video") => {
    const isAudio = file.type.startsWith("audio/");
    if (expectedType === "audio" && !isAudio) {
      toast.error("Please choose an audio file");
      return;
    }
    if (expectedType === "video" && !file.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    if (expectedType === "audio") setAudioUploading(true);
    else setVidUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const r = await api.post<{ url: string; mediaType?: "audio" | "video"; field?: "audioMessageUrl" | "introVideoUrl" }>(
        "/advisor/application/intro-video",
        fd,
        { isFormData: true }
      );
      if (r.data?.url) {
        if ((r.data.mediaType || expectedType) === "audio") {
          setP({ ...p, audioMessageUrl: r.data.url });
        } else {
          setP({ ...p, introVideoUrl: r.data.url });
        }
      }
      toast.success(expectedType === "audio" ? "Audio message uploaded" : "Intro video uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      if (expectedType === "audio") setAudioUploading(false);
      else setVidUploading(false);
    }
  };

  const audioMessageUrl =
    p.audioMessageUrl || (p.introVideoUrl && isAudioMediaUrl(p.introVideoUrl) ? p.introVideoUrl : "");
  const introVideoUrl = p.introVideoUrl && !isAudioMediaUrl(p.introVideoUrl) ? p.introVideoUrl : "";

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
                  if (f) openPhotoCrop(f);
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
          {photoCropPreview && (
            <PhotoCropModal
              preview={photoCropPreview}
              zoom={photoCropZoom}
              setZoom={setPhotoCropZoom}
              uploading={uploading}
              onCancel={closePhotoCrop}
              onApply={uploadCroppedPhoto}
            />
          )}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Audio Message</h3>
          <div className="rounded-xl bg-slate-100 mt-3 min-h-28 overflow-hidden flex items-center justify-center px-4">
            {audioMessageUrl ? (
              <audio src={audioMessageUrl} controls className="w-full" />
            ) : (
              <div className="text-slate-500 text-sm">No audio message uploaded</div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => audioRef.current?.click()}
            loading={audioUploading}
          >
            <UploadIcon size={14} />
            Upload Audio Message
          </Button>
          <input
            ref={audioRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadIntroMedia(f, "audio");
            }}
          />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Intro Video</h3>
          <div className="rounded-xl bg-slate-100 aspect-video mt-3 overflow-hidden flex items-center justify-center">
            {introVideoUrl ? (
              <video src={introVideoUrl} controls className="w-full h-full" />
            ) : (
              <div className="text-slate-500 text-sm">No intro video uploaded</div>
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
            Upload Intro Video
          </Button>
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadIntroMedia(f, "video");
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
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Country
            </span>
            <Combobox
              options={countries.map((c) => ({ value: c.iso2, label: c.name }))}
              value={u.country || ""}
              onChange={(v) => setU({ ...u, country: v, city: "" })}
              placeholder="Select country…"
              searchPlaceholder="Search countries…"
              emptyText="No country found."
              triggerClassName="h-11 px-3 bg-white border-slate-200 hover:border-slate-300 focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              City
            </span>
            <Combobox
              options={cities.map((c) => ({ value: c, label: c }))}
              value={u.city || ""}
              onChange={(v) => setU({ ...u, city: v })}
              placeholder={u.country ? "Select city…" : "Select a country first"}
              searchPlaceholder="Search cities…"
              emptyText="No city found."
              disabled={!u.country}
              allowCustom
              triggerClassName="h-11 px-3 bg-white border-slate-200 hover:border-slate-300 focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20"
            />
          </label>
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

        <div className="mt-4">
          <FormTextarea
            label="Brief Bio"
            value={p.bio || ""}
            onChange={(v) => setP({ ...p, bio: v })}
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}

function PhotoCropModal({
  preview,
  zoom,
  setZoom,
  uploading,
  onCancel,
  onApply,
}: {
  preview: string;
  zoom: number;
  setZoom: (v: number) => void;
  uploading: boolean;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Crop profile photo</h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjust the crop before uploading.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close crop"
          >
            ×
          </button>
        </div>

        <div className="mx-auto h-72 w-72 max-w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Profile crop preview"
            className="h-full w-full object-cover"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[#0a7a90]"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" loading={uploading} onClick={onApply}>
            Crop & Upload
          </Button>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
      <h3 className="font-bold text-slate-900 mb-5">Expertise & Categories</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Skills/Expertise
          </h4>
          <div className="relative mb-3">
            <UserIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Choose Skills & Experties"
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("expertise", skillInput);
                  setSkillInput("");
                }
              }}
            />
            <ChevronDownIcon
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
          <h4 className="text-base font-semibold text-slate-900 mb-3">Style</h4>
          <div className="relative mb-3">
            <UserIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={styleInput}
              onChange={(e) => setStyleInput(e.target.value)}
              placeholder="Choose Style"
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("styles", styleInput);
                  setStyleInput("");
                }
              }}
            />
            <ChevronDownIcon
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Languages
          </h4>
          <div className="relative mb-3">
            <UserIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              placeholder="Type your language"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("languages", langInput);
                  setLangInput("");
                }
              }}
              className="w-full h-11 pl-10 pr-20 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
            />
            <button
              type="button"
              onClick={() => {
                addItem("languages", langInput);
                setLangInput("");
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold hover:bg-slate-200"
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
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-8">
      <div>
        <h3 className="font-bold text-slate-900 mb-4">
          Credit Pricing & Availabilities
        </h3>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Credits per minute
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PricingInput
            label="Chat credits/min"
            value={p.pricing.chatPerMin}
            onChange={(v) =>
              setP({ ...p, pricing: { ...p.pricing, chatPerMin: v } })
            }
          />
          <PricingInput
            label="Audio call credits/min"
            value={p.pricing.callPerMin}
            onChange={(v) =>
              setP({ ...p, pricing: { ...p.pricing, callPerMin: v } })
            }
          />
          <PricingInput
            label="Video call credits/min"
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
        <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-900">Auto Online Mode</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Automatically go online during your scheduled hours
            </div>
          </div>
          <Toggle
            checked={!!p.autoOnlineMode}
            onChange={(v) => setP({ ...p, autoOnlineMode: v })}
          />
        </div>
      </div>

      <DateAvailabilityCalendar p={p} setP={setP} />
    </div>
  );
}

function DateAvailabilityCalendar({
  p,
  setP,
}: {
  p: AdvisorProfile;
  setP: (next: AdvisorProfile) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => monthStart(today));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const availability = p.dateAvailability || {};
  const selectedRule = availability[selectedDate] || { unavailable: false, slots: [] };
  const selectedSlots = selectedRule.unavailable ? [] : selectedRule.slots || [];
  const cells = calendarCells(viewMonth);

  const patchDate = (date: string, patch: DateAvailability) => {
    setP({
      ...p,
      dateAvailability: {
        ...(p.dateAvailability || {}),
        [date]: patch,
      },
    });
  };

  const updateSlot = (index: number, patch: Partial<ScheduleSlot>) => {
    const slots = selectedSlots.map((slot, i) =>
      i === index ? { ...slot, ...patch } : slot,
    );
    patchDate(selectedDate, { unavailable: false, slots });
  };

  const addSlot = () => {
    patchDate(selectedDate, {
      unavailable: false,
      slots: [...selectedSlots, { from: "09:00", to: "18:00" }],
    });
  };

  const removeSlot = (index: number) => {
    patchDate(selectedDate, {
      unavailable: false,
      slots: selectedSlots.filter((_, i) => i !== index),
    });
  };

  const markUnavailable = (unavailable: boolean) => {
    patchDate(selectedDate, {
      unavailable,
      slots: unavailable
        ? []
        : selectedSlots.length
          ? selectedSlots
          : [{ from: "09:00", to: "18:00" }],
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon /> Availability Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewMonth(monthStart(now));
              setSelectedDate(dateKey(now));
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="font-bold text-slate-900">
              {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <LegendDot className="bg-emerald-400" label="Available" />
              <LegendDot className="bg-slate-300" label="Unavailable" />
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-bold uppercase text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const key = dateKey(cell);
              const rule = availability[key];
              const unavailable = rule?.unavailable === true;
              const slotCount = rule?.slots?.length || 0;
              const isCurrentMonth = cell.getMonth() === viewMonth.getMonth();
              const isSelected = key === selectedDate;
              const isToday = key === dateKey(today);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-24 border-r border-b border-slate-100 p-2 text-left transition-colors ${
                    isSelected
                      ? "bg-[#e6f2f6] ring-2 ring-inset ring-[#0a7a90]"
                      : unavailable
                        ? "bg-slate-100 text-slate-400"
                        : slotCount
                          ? "bg-emerald-50"
                          : "bg-white hover:bg-slate-50"
                  } ${isCurrentMonth ? "" : "opacity-45"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-[#0a7a90] text-white" : "text-slate-700"
                  }`}>
                    {cell.getDate()}
                  </span>
                  <div className="mt-2 min-h-5">
                    {unavailable ? (
                      <span className="text-xs font-semibold text-slate-500">Unavailable</span>
                    ) : slotCount ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        {slotCount} Slot{slotCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-500">Selected Date</div>
              <h4 className="mt-1 text-lg font-bold text-slate-900">
                {formatDateLabel(selectedDate)}
              </h4>
            </div>
            <Toggle checked={!selectedRule.unavailable} onChange={(v) => markUnavailable(!v)} />
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-slate-900">Available Time Slots</h5>
              <button
                type="button"
                onClick={addSlot}
                disabled={selectedRule.unavailable}
                className="text-sm font-semibold text-[#0a7a90] hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                + Add Time Slot
              </button>
            </div>

            {selectedRule.unavailable ? (
              <div className="rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">
                This day is marked unavailable.
              </div>
            ) : selectedSlots.length ? (
              selectedSlots.map((slot, index) => (
                <div key={`${selectedDate}-${index}`} className="flex items-center gap-2">
                  <TimeInput value={slot.from} onChange={(v) => updateSlot(index, { from: v })} />
                  <span className="text-xs text-slate-500">To</span>
                  <TimeInput value={slot.to} onChange={(v) => updateSlot(index, { to: v })} />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600"
                    aria-label="Remove time slot"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No slots added for this day.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => markUnavailable(true)}
              className="h-10 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Mark as Unavailable
            </button>
            <button
              type="button"
              onClick={() => markUnavailable(false)}
              className="h-10 rounded-lg bg-[#0a7a90] text-sm font-semibold text-white hover:bg-[#076377]"
            >
              Mark as Available
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarCells(month: Date) {
  const first = monthStart(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0a7a90] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
      <ClockIcon
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
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
  const format = (n: number) => {
    const next = Number(n);
    if (!Number.isFinite(next) || next <= 0) return "00";
    return next.toFixed(2);
  };
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    setDisplay(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={(e) => {
            const next = e.target.value;
            if (!/^\d*\.?\d*$/.test(next)) return;
            setDisplay(next);
            onChange(Number(next) || 0);
          }}
          onBlur={() => setDisplay(format(value))}
          className="w-full h-11 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90]"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-72" />
        <CardSkeleton className="h-72" />
      </div>
    );

  const breakdown = (perf?.ratingBreakdown || {}) as Record<string, number>;
  const total = reviews.length || 1;
  const counts = [5, 4, 3, 2, 1].map(
    (s) => reviews.filter((r) => Math.round(r.rating || 0) === s).length
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Reviews & Ratings</h2>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-72" />
        <CardSkeleton className="h-72" />
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Performance & Tier</h2>
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
          tone="teal"
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
  tone: "amber" | "emerald" | "violet" | "teal";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const cls: Record<string, { card: string; iconBg: string; iconColor: string }> = {
    amber: {
      card: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
    },
    emerald: {
      card: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    violet: {
      card: "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    teal: {
      card: "bg-teal-50 border-teal-200",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
  };
  const c = cls[tone];
  return (
    <div className={`rounded-2xl border-2 p-5 ${c.card}`}>
      <div
        className={`h-10 w-10 rounded-lg ${c.iconBg} ${c.iconColor} flex items-center justify-center`}
      >
        {icon}
      </div>
      <div className="text-[11px] uppercase font-semibold text-slate-500 mt-4 tracking-wider">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-80" />
        ))}
      </div>
    );

  const planCards = Object.entries(plans)
    .map(([key, plan], index) => {
      const impressions = Number(plan.impressionsPerDay || 0);
      const fallbackFeatures = [
        `${Number(plan.visibilityBoost || 1)}x profile visibility`,
        impressions > 0 ? `${impressions} impressions/day` : "Unlimited impressions",
      ];
      return {
        key,
        title: plan.label || tierLabel(key),
        price: Number(plan.price || 0),
        days: Number(plan.days || 1),
        tone: plan.tone || "emerald",
        isPopular: plan.isPopular === true,
        sortOrder: Number(plan.sortOrder ?? index + 1),
        features: plan.features?.length ? plan.features : fallbackFeatures,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Boost Your Visibility</h2>
        <p className="text-sm text-slate-500 mt-1">
          Increase your profile visibility and get more clients with our
          promotion tools
        </p>
      </div>

      {active && (() => {
        const planCfg = plans?.[active.plan];
        const perDay = Number(planCfg?.impressionsPerDay) || 0;
        const cap = perDay > 0 ? perDay * (planCfg?.days || 0) : 0;
        const used = active.impressions || 0;
        const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 50;
        return (
          <div className="bg-violet-50 border-2 border-violet-300 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-slate-900">Active Promotion</h3>
              <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Plan</div>
                <div className="font-bold text-slate-900">
                  {planCfg?.label || tierLabel(active.plan)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Expires</div>
                <div className="font-bold text-slate-900">
                  {fmtDate(active.expiresAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Impressions</div>
                <div className="font-bold text-slate-900">
                  {used.toLocaleString()}
                  {cap > 0 ? ` / ${cap.toLocaleString()}` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">New Clients</div>
                <div className="font-bold text-slate-900">
                  +{active.newClients || 0}
                </div>
              </div>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0a7a90] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {planCards.map((p) => {
          const isActive = active?.plan === p.key;
          const isPopular = p.isPopular;
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                p.tone === "violet"
                  ? "bg-violet-100 border-violet-300"
                  : p.tone === "amber"
                    ? "bg-amber-50 border-amber-200"
                    : p.tone === "sky"
                      ? "bg-sky-50 border-sky-200"
                      : "bg-white border-slate-200"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-700 text-white text-[11px] font-semibold rounded-full px-3 py-1 inline-flex items-center gap-1 shadow-sm">
                  <CrownIcon size={12} />
                  Most Popular
                </span>
              )}
              <div
                className={`h-14 w-14 rounded-xl flex items-center justify-center mb-5 ${
                  p.tone === "violet"
                    ? "bg-violet-200 text-violet-700"
                    : p.tone === "amber"
                      ? "bg-amber-200 text-amber-600"
                      : p.tone === "sky"
                        ? "bg-sky-100 text-sky-700"
                      : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <ZapIcon size={26} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{p.title}</div>
              <div className="mt-3 mb-5">
                <span className="text-4xl font-bold text-slate-900">
                  ${p.price.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 ml-1">
                  /{p.days} days
                </span>
              </div>
              <ul className="text-sm text-slate-700 space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!!activating || isActive}
                onClick={() => activate(p.key)}
                className={`mt-auto w-full h-12 rounded-lg font-semibold text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : p.tone === "violet"
                      ? "bg-[#0a7a90] text-white hover:bg-[#076377]"
                      : p.tone === "amber"
                        ? "bg-white text-[#0a7a90] border border-amber-300 hover:bg-amber-100"
                        : p.tone === "sky"
                          ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                } disabled:opacity-60`}
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
  list,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  list?: string;
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
          list={list}
          autoComplete={list ? "off" : undefined}
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
