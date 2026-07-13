"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast";
import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Input";
import { CardSkeleton } from "../../components/ui/Skeleton";
import {
  BookingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
} from "../../components/Icons";
import type {
  AdvisorProfile,
  AdvisorUser,
  DateAvailability,
  DaySchedule,
  ScheduleSlot,
  SessionDoc,
} from "../../lib/types";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_NEW_SLOT: ScheduleSlot = { from: "09:00", to: "10:00" };
const DEFAULT_AVAILABILITY_SETTINGS = {
  minNoticeMinutes: 0,
  bookingWindowDays: 30,
  bufferMinutes: 0,
  defaultDurationMinutes: 15,
  sameDayBooking: true,
};
const SESSION_TYPE_LABELS = [
  { key: "chat", label: "Chat" },
  { key: "call", label: "Call" },
  { key: "video", label: "Video" },
] as const;

function normalizeSlot(slot: Partial<ScheduleSlot>): ScheduleSlot | null {
  const from = String(slot.from || "").trim();
  const to = String(slot.to || "").trim();
  if (!from || !to) return null;
  return { from, to };
}

function slotKey(slot: ScheduleSlot) {
  return `${slot.from}-${slot.to}`;
}

function dedupeSlots(slots: ScheduleSlot[]) {
  const seen = new Set<string>();
  const unique: ScheduleSlot[] = [];
  for (const slot of slots) {
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(slot);
  }
  return unique;
}

function hasDuplicateSlot(slots: ScheduleSlot[]) {
  return dedupeSlots(slots).length !== slots.length;
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function toTime(minutes: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function nextSmartSlot(existingSlots: ScheduleSlot[]) {
  const existing = dedupeSlots(existingSlots);
  if (!existing.length) return DEFAULT_NEW_SLOT;
  const latestEnd = Math.max(...existing.map((slot) => toMinutes(slot.to)));
  let start = latestEnd;
  let end = Math.min(start + 60, 23 * 60 + 59);
  if (end <= start) {
    start = 8 * 60;
    end = 9 * 60;
  }

  let next = { from: toTime(start), to: toTime(end) };
  const taken = new Set(existing.map(slotKey));
  while (taken.has(slotKey(next)) && end < 23 * 60 + 59) {
    start += 60;
    end = Math.min(start + 60, 23 * 60 + 59);
    next = { from: toTime(start), to: toTime(end) };
  }
  return next;
}

function normalizeDaySchedule(schedule?: Partial<DaySchedule>): DaySchedule {
  const cleanSlots = (Array.isArray(schedule?.slots) ? schedule.slots : [])
    .map(normalizeSlot)
    .filter((slot): slot is ScheduleSlot => !!slot);
  const uniqueSlots = dedupeSlots(cleanSlots);
  const first = uniqueSlots[0];
  return {
    enabled: !!schedule?.enabled,
    from: first?.from || String(schedule?.from || "").trim(),
    to: first?.to || String(schedule?.to || "").trim(),
    slots: uniqueSlots,
  };
}

function normalizeDateAvailability(value?: Record<string, Partial<DateAvailability>>) {
  const normalized: Record<string, DateAvailability> = {};
  for (const [date, schedule] of Object.entries(value || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const slots = (schedule.slots || [])
      .map(normalizeSlot)
      .filter((slot): slot is ScheduleSlot => !!slot);
    normalized[date] = {
      unavailable: schedule.unavailable === true,
      slots: schedule.unavailable === true ? [] : dedupeSlots(slots),
    };
  }
  return normalized;
}

function normalizeAvailabilitySettings(settings?: AdvisorProfile["availabilitySettings"]) {
  return {
    minNoticeMinutes: Number(settings?.minNoticeMinutes ?? DEFAULT_AVAILABILITY_SETTINGS.minNoticeMinutes),
    bookingWindowDays: Number(settings?.bookingWindowDays ?? DEFAULT_AVAILABILITY_SETTINGS.bookingWindowDays),
    bufferMinutes: Number(settings?.bufferMinutes ?? DEFAULT_AVAILABILITY_SETTINGS.bufferMinutes),
    defaultDurationMinutes: Number(settings?.defaultDurationMinutes ?? DEFAULT_AVAILABILITY_SETTINGS.defaultDurationMinutes),
    sameDayBooking: settings?.sameDayBooking !== false,
  };
}

function normalizeProfile(profile: AdvisorProfile) {
  const weeklySchedule = Object.fromEntries(
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day) => [day, normalizeDaySchedule(profile.weeklySchedule?.[day])]),
  );
  return {
    ...profile,
    sessionTypes: {
      chat: profile.sessionTypes?.chat !== false,
      call: profile.sessionTypes?.call !== false,
      video: profile.sessionTypes?.video !== false,
    },
    availabilitySettings: normalizeAvailabilitySettings(profile.availabilitySettings),
    availabilityTemplates: (profile.availabilityTemplates || []).map((template) => ({
      ...template,
      weeklySchedule: Object.fromEntries(
        [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].map((day) => [day, normalizeDaySchedule(template.weeklySchedule?.[day])]),
      ),
    })),
    weeklySchedule,
    dateAvailability: normalizeDateAvailability(profile.dateAvailability),
  };
}

export default function AvailabilityPage() {
  const toast = useToast();
  const { refreshMe } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<AdvisorUser | null>(null);
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [bookings, setBookings] = useState<SessionDoc[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => monthStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyDate, setApplyDate] = useState(() => dateKey(new Date()));
  const [applySlotKeys, setApplySlotKeys] = useState<string[]>([]);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [timeOffDate, setTimeOffDate] = useState(() => dateKey(new Date()));
  const [timeOffSlotKeys, setTimeOffSlotKeys] = useState<string[]>([]);
  const [timeOffFullDay, setTimeOffFullDay] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get<{ user: AdvisorUser; profile: AdvisorProfile }>(
          "/advisor/profile",
        );
        if (!cancel && r.data) {
          setUser(r.data.user);
          setProfile(normalizeProfile(r.data.profile));
        }
      } catch {
        if (!cancel) toast.error("Could not load availability");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancel = false;
    const start = monthStart(viewMonth);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    (async () => {
      setBookingsLoading(true);
      try {
        const r = await api.get<SessionDoc[]>("/sessions/mine/calendar", {
          from: start.toISOString(),
          to: end.toISOString(),
        });
        if (!cancel) setBookings(r.data || []);
      } catch {
        if (!cancel) setBookings([]);
      } finally {
        if (!cancel) setBookingsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [viewMonth]);

  const availability = profile?.dateAvailability || {};
  const hasDateOverride = (key: string) => Object.prototype.hasOwnProperty.call(availability, key);
  const getWeeklySlots = (key: string): ScheduleSlot[] => {
    const date = parseDateKey(key);
    const weekly = profile?.weeklySchedule?.[WEEKDAY_KEYS[date.getDay()]];
    if (!weekly?.enabled) return [];
    const storedSlots = weekly.slots && weekly.slots.length ? weekly.slots : [];
    const fromToSlot = weekly.from && weekly.to ? [{ from: weekly.from, to: weekly.to }] : [];
    return dedupeSlots(storedSlots.length ? storedSlots : fromToSlot);
  };

  const getAvailabilityRule = (key: string): DateAvailability => {
    if (hasDateOverride(key)) return availability[key];
    return { unavailable: false, slots: getWeeklySlots(key) };
  };
  const getTimeOffBaseSlots = (key: string) => {
    const weeklySlots = getWeeklySlots(key);
    if (weeklySlots.length) return weeklySlots;
    const rule = getAvailabilityRule(key);
    return rule.unavailable ? [] : dedupeSlots(rule.slots || []);
  };
  const getTimeOffBlockedKeys = (key: string) => {
    const baseSlots = getTimeOffBaseSlots(key);
    const rule = getAvailabilityRule(key);
    if (rule.unavailable) return baseSlots.map(slotKey);
    const available = new Set(dedupeSlots(rule.slots || []).map(slotKey));
    return baseSlots.filter((slot) => !available.has(slotKey(slot))).map(slotKey);
  };
  const isTimeOffSlotEditable = (key: string, slot: ScheduleSlot) => {
    const today = dateKey(new Date());
    if (key > today) return true;
    if (key < today) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return toMinutes(slot.from) > currentMinutes;
  };
  const selectedRule = getAvailabilityRule(selectedDate);
  const selectedSlots = selectedRule.unavailable ? [] : dedupeSlots(selectedRule.slots || []);
  const selectedApplySlots = selectedSlots.filter((slot) => applySlotKeys.includes(slotKey(slot)));
  const allApplySlotsSelected = selectedSlots.length > 0 && selectedApplySlots.length === selectedSlots.length;
  const selectedWeekdayIndex = parseDateKey(selectedDate).getDay();
  const selectedWeekdayKey = WEEKDAY_KEYS[selectedWeekdayIndex];
  const selectedWeekdayLabel = WEEKDAY_LABELS[selectedWeekdayIndex];
  const selectedWeeklySchedule = profile?.weeklySchedule?.[selectedWeekdayKey];
  const selectedHasOverride = hasDateOverride(selectedDate);
  const selectedWeeklySlots = getWeeklySlots(selectedDate);
  const selectedWeekDates = useMemo(() => {
    const selected = parseDateKey(selectedDate);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return dateKey(date);
    });
  }, [selectedDate]);
  const todayKey = dateKey(new Date());
  const editableWeekDates = selectedWeekDates.filter((key) => key >= todayKey);
  const fullEditableWeekHasOverrides =
    editableWeekDates.length > 0 && editableWeekDates.every((key) => hasDateOverride(key));
  const selectedSourceLabel = selectedHasOverride
    ? "Date override"
    : selectedWeeklySlots.length
      ? "Weekly recurring"
      : "No weekly schedule";
  const settings = normalizeAvailabilitySettings(profile?.availabilitySettings);
  const templates = profile?.availabilityTemplates || [];
  const timeOffBaseSlots = getTimeOffBaseSlots(timeOffDate);
  const editableTimeOffSlots = timeOffBaseSlots.filter((slot) => isTimeOffSlotEditable(timeOffDate, slot));
  const allEditableTimeOffSelected =
    timeOffFullDay ||
    (editableTimeOffSlots.length > 0 && editableTimeOffSlots.every((slot) => timeOffSlotKeys.includes(slotKey(slot))));

  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const booking of bookings) {
      if (!booking.scheduledFor) continue;
      const key = dateKey(new Date(booking.scheduledFor));
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [bookings]);

  const setDateRule = (date: string, rule: DateAvailability) => {
    if (!profile) return;
    setProfile({
      ...profile,
      dateAvailability: {
        ...(profile.dateAvailability || {}),
        [date]: {
          ...rule,
          slots: rule.unavailable ? [] : dedupeSlots(rule.slots || []),
        },
      },
    });
  };

  const removeDateOverride = (date: string) => {
    if (!profile) return;
    const next = { ...(profile.dateAvailability || {}) };
    delete next[date];
    setProfile({ ...profile, dateAvailability: next });
  };

  const setWeeklySchedule = (day: string, schedule: DaySchedule) => {
    if (!profile) return;
    const slots = dedupeSlots(schedule.slots || []);
    setProfile({
      ...profile,
      weeklySchedule: {
        ...(profile.weeklySchedule || {}),
        [day]: {
          ...schedule,
          from: slots[0]?.from || schedule.from,
          to: slots[0]?.to || schedule.to,
          slots,
        },
      },
    });
  };

  const setSessionTypeEnabled = (type: "chat" | "call" | "video", enabled: boolean) => {
    if (!profile) return;
    setProfile({
      ...profile,
      sessionTypes: {
        chat: profile.sessionTypes?.chat !== false,
        call: profile.sessionTypes?.call !== false,
        video: profile.sessionTypes?.video !== false,
        [type]: enabled,
      },
    });
  };

  const setAvailabilitySetting = (
    key: keyof NonNullable<AdvisorProfile["availabilitySettings"]>,
    value: number | boolean,
  ) => {
    if (!profile) return;
    setProfile({
      ...profile,
      availabilitySettings: {
        ...normalizeAvailabilitySettings(profile.availabilitySettings),
        [key]: value,
      },
    });
  };

  const createTemplate = () => {
    if (!profile?.weeklySchedule) return;
    const name = templateName.trim() || `Weekly schedule ${profile.availabilityTemplates?.length ? profile.availabilityTemplates.length + 1 : 1}`;
    setProfile({
      ...profile,
      availabilityTemplates: [
        ...(profile.availabilityTemplates || []),
        {
          id: `template-${Date.now()}`,
          name,
          weeklySchedule: normalizeProfile({ ...profile, weeklySchedule: profile.weeklySchedule }).weeklySchedule || {},
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setTemplateName("");
    toast.success("Template saved. Save changes to keep it.");
  };

  const applyTemplate = (templateId: string) => {
    if (!profile) return;
    const template = (profile.availabilityTemplates || []).find((item) => item.id === templateId);
    if (!template) return;
    setProfile({
      ...profile,
      weeklySchedule: normalizeProfile({ ...profile, weeklySchedule: template.weeklySchedule }).weeklySchedule,
    });
    setTemplatesModalOpen(false);
    toast.success("Template applied. Save changes to keep it.");
  };

  const deleteTemplate = (templateId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      availabilityTemplates: (profile.availabilityTemplates || []).filter((item) => item.id !== templateId),
    });
    toast.success("Template removed. Save changes to keep it.");
  };

  const setSelectedWeeklyEnabled = (enabled: boolean) => {
    const current = selectedWeeklySchedule || {
      enabled: false,
      from: "",
      to: "",
      slots: [],
    };
    setWeeklySchedule(selectedWeekdayKey, {
      ...current,
      enabled,
      slots: enabled ? current.slots || [] : current.slots || [],
    });
  };

  const addWeeklySlot = () => {
    const current = selectedWeeklySchedule || {
      enabled: true,
      from: DEFAULT_NEW_SLOT.from,
      to: DEFAULT_NEW_SLOT.to,
      slots: [],
    };
    const slots = dedupeSlots([...(current.slots || []), nextSmartSlot(current.slots || [])]);
    setWeeklySchedule(selectedWeekdayKey, {
      ...current,
      enabled: true,
      from: slots[0]?.from || current.from,
      to: slots[0]?.to || current.to,
      slots,
    });
  };

  const updateWeeklySlot = (index: number, patch: Partial<ScheduleSlot>) => {
    const current = selectedWeeklySchedule || {
      enabled: true,
      from: "",
      to: "",
      slots: [],
    };
    const slots = (current.slots || []).map((slot, i) =>
      i === index ? { ...slot, ...patch } : slot,
    );
    if (hasDuplicateSlot(slots)) {
      toast.error("This weekly slot already exists");
      return;
    }
    setWeeklySchedule(selectedWeekdayKey, {
      ...current,
      enabled: true,
      from: slots[0]?.from || current.from,
      to: slots[0]?.to || current.to,
      slots,
    });
  };

  const removeWeeklySlot = (index: number) => {
    const current = selectedWeeklySchedule || {
      enabled: false,
      from: "",
      to: "",
      slots: [],
    };
    const slots = (current.slots || []).filter((_, i) => i !== index);
    setWeeklySchedule(selectedWeekdayKey, {
      ...current,
      enabled: slots.length > 0,
      from: slots[0]?.from || "",
      to: slots[0]?.to || "",
      slots,
    });
  };

  const clearDateOverride = () => {
    removeDateOverride(selectedDate);
  };

  const createDateOverride = () => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: selectedSlots.length ? selectedSlots : selectedWeeklySlots,
    });
  };

  const save = async () => {
    if (!profile || !user) return;
    setSaving(true);
    try {
      const normalized = normalizeProfile(profile);
      const res = await api.patch("/advisor/profile", {
        name: user.name,
        phone: user.phone,
        country: user.country,
        city: user.city,
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        professionalTitle: profile.professionalTitle,
        bio: profile.bio,
        yearsOfExperience: profile.yearsOfExperience,
        expertise: profile.expertise,
        styles: profile.styles,
        languages: profile.languages,
        pricing: normalized.pricing,
        sessionTypes: normalized.sessionTypes,
        autoOnlineMode: normalized.autoOnlineMode,
        availabilitySettings: normalized.availabilitySettings,
        availabilityTemplates: normalized.availabilityTemplates,
        weeklySchedule: normalized.weeklySchedule,
        dateAvailability: normalized.dateAvailability,
      });
      toast.success(res.message || "Availability saved");
      refreshMe();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addSlot = () => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: [...selectedSlots, nextSmartSlot(selectedSlots)],
    });
  };

  const updateSlot = (index: number, patch: Partial<ScheduleSlot>) => {
    const slots = selectedSlots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    if (hasDuplicateSlot(slots)) {
      toast.error("This date slot already exists");
      return;
    }
    setDateRule(selectedDate, {
      unavailable: false,
      slots,
    });
  };

  const removeSlot = (index: number) => {
    setDateRule(selectedDate, {
      unavailable: false,
      slots: selectedSlots.filter((_, i) => i !== index),
    });
  };

  const markUnavailable = (unavailable: boolean) => {
    setDateRule(selectedDate, {
      unavailable,
      slots: unavailable ? [] : selectedSlots,
    });
  };

  const loadTimeOffDate = (key: string) => {
    const baseSlots = getTimeOffBaseSlots(key);
    const blockedKeys = getTimeOffBlockedKeys(key);
    const rule = getAvailabilityRule(key);
    setTimeOffDate(key);
    setTimeOffSlotKeys(blockedKeys);
    setTimeOffFullDay(rule.unavailable || (baseSlots.length > 0 && blockedKeys.length === baseSlots.length));
  };

  const openTimeOffModal = () => {
    loadTimeOffDate(selectedDate);
    setTimeOffModalOpen(true);
  };

  const toggleTimeOffSlot = (slot: ScheduleSlot, checked: boolean) => {
    const key = slotKey(slot);
    setTimeOffSlotKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key),
    );
    if (!checked) setTimeOffFullDay(false);
  };

  const toggleAllTimeOffSlots = (checked: boolean) => {
    const editableKeys = getTimeOffBaseSlots(timeOffDate)
      .filter((slot) => isTimeOffSlotEditable(timeOffDate, slot))
      .map(slotKey);
    setTimeOffFullDay(checked);
    setTimeOffSlotKeys((current) => {
      const lockedKeys = current.filter((key) => {
        const slot = getTimeOffBaseSlots(timeOffDate).find((item) => slotKey(item) === key);
        return slot ? !isTimeOffSlotEditable(timeOffDate, slot) : false;
      });
      return checked ? Array.from(new Set([...lockedKeys, ...editableKeys])) : lockedKeys;
    });
  };

  const applyTimeOff = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(timeOffDate)) {
      toast.error("Choose a valid date");
      return;
    }
    if (timeOffDate < todayKey) {
      toast.error("Past dates can no longer be changed");
      return;
    }

    const baseSlots = getTimeOffBaseSlots(timeOffDate);
    if (!baseSlots.length) {
      setDateRule(timeOffDate, { unavailable: true, slots: [] });
      setSelectedDate(timeOffDate);
      setTimeOffModalOpen(false);
      toast.success("Full day time off added. Save changes to keep it.");
      return;
    }

    const currentBlocked = new Set(getTimeOffBlockedKeys(timeOffDate));
    const requestedBlocked = new Set(timeOffSlotKeys);
    const nextBlocked = baseSlots.filter((slot) => {
      const key = slotKey(slot);
      if (!isTimeOffSlotEditable(timeOffDate, slot)) return currentBlocked.has(key);
      return timeOffFullDay || requestedBlocked.has(key);
    });
    const nextBlockedKeys = new Set(nextBlocked.map(slotKey));
    const availableSlots = baseSlots.filter((slot) => !nextBlockedKeys.has(slotKey(slot)));

    if (!nextBlocked.length) {
      removeDateOverride(timeOffDate);
      setSelectedDate(timeOffDate);
      setTimeOffModalOpen(false);
      toast.success("Time off removed. Save changes to keep it.");
      return;
    }

    if (!availableSlots.length) {
      setDateRule(timeOffDate, { unavailable: true, slots: [] });
    } else {
      setDateRule(timeOffDate, { unavailable: false, slots: availableSlots });
    }
    setSelectedDate(timeOffDate);
    setTimeOffModalOpen(false);
    toast.success("Time off updated. Save changes to keep it.");
  };

  const copyToWeek = () => {
    if (!editableWeekDates.length) {
      toast.error("Past weeks can no longer be changed");
      return;
    }
    if (!selectedSlots.length) {
      toast.error("No slots available to copy");
      return;
    }
    const next = { ...(profile?.dateAvailability || {}) };
    for (const key of editableWeekDates) {
      next[key] = { unavailable: false, slots: dedupeSlots(selectedSlots) };
    }
    if (profile) setProfile({ ...profile, dateAvailability: next });
    toast.success(
      editableWeekDates.length === 7
        ? "Copied to full week"
        : "Copied to remaining days in this week",
    );
  };

  const removeWeekOverrides = () => {
    if (!profile) return;
    if (!editableWeekDates.length) {
      toast.error("Past weeks can no longer be changed");
      return;
    }
    const next = { ...(profile.dateAvailability || {}) };
    let removed = 0;
    for (const key of editableWeekDates) {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
        removed += 1;
      }
    }
    if (!removed) {
      toast.error("No week overrides to remove");
      return;
    }
    setProfile({ ...profile, dateAvailability: next });
    toast.success(
      editableWeekDates.length === 7
        ? "Removed week overrides"
        : "Removed remaining week overrides",
    );
  };

  const toggleWeekOverrides = () => {
    if (fullEditableWeekHasOverrides) {
      removeWeekOverrides();
      return;
    }
    copyToWeek();
  };

  const openApplyModal = () => {
    setApplyDate(selectedDate);
    setApplySlotKeys(selectedSlots.map(slotKey));
    setApplyModalOpen(true);
  };

  const toggleApplySlot = (slot: ScheduleSlot, checked: boolean) => {
    const key = slotKey(slot);
    setApplySlotKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key),
    );
  };

  const toggleAllApplySlots = (checked: boolean) => {
    setApplySlotKeys(checked ? selectedSlots.map(slotKey) : []);
  };

  const applyToAnotherDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(applyDate)) {
      toast.error("Choose a valid date");
      return;
    }
    if (!selectedApplySlots.length) {
      toast.error("Choose at least one slot to copy");
      return;
    }
    setDateRule(applyDate, { unavailable: false, slots: dedupeSlots(selectedApplySlots) });
    setApplyModalOpen(false);
    toast.success("Date override created");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton className="h-20" />
        <CardSkeleton className="h-[620px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Availability Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set your availability so clients can book sessions with you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setSettingsModalOpen(true)}
            className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            <SettingsIcon size={15} />
            Calendar Settings
          </Button>
          <Button
            variant="secondary"
            onClick={() => setTemplatesModalOpen(true)}
            className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            <BookingsIcon size={15} />
            Availability Templates
          </Button>
          <Button onClick={openTimeOffModal}>
            <PlusIcon size={15} />
            Add Time Off
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconButton label="Previous month" onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
                <ChevronLeftIcon size={16} />
              </IconButton>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </button>
              <IconButton label="Next month" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
                <ChevronRightIcon size={16} />
              </IconButton>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewMonth(monthStart(now));
                  setSelectedDate(dateKey(now));
                }}
                className="h-8 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(monthStart(parseDateKey(selectedDate)))}
                className="h-8 rounded-md bg-[#e6f2f6] px-3 text-sm font-bold text-[#0a7a90]"
              >
                Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-bold text-slate-500">
            {DAYS.map((day) => (
              <div key={day} className="py-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const key = dateKey(cell);
              const rule = getAvailabilityRule(key);
              const overridden = hasDateOverride(key);
              const count = rule.unavailable ? 0 : rule.slots?.length || 0;
              const unavailable = rule.unavailable === true;
              const bookingCount = bookingsByDate.get(key) || 0;
              const booked = bookingCount > 0;
              const inMonth = cell.getMonth() === viewMonth.getMonth();
              const selected = key === selectedDate;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-28 border-b border-r border-slate-100 p-2 text-left transition ${
                    selected
                      ? "bg-[#e6f2f6] ring-2 ring-inset ring-[#0a7a90]"
                      : unavailable
                        ? "bg-red-50/60"
                        : count
                          ? "bg-emerald-50/60 hover:bg-emerald-50"
                          : booked
                            ? "bg-blue-50/70 hover:bg-blue-50"
                            : "bg-white hover:bg-slate-50"
                  } ${inMonth ? "" : "opacity-45"}`}
                >
                  <span className="text-sm font-semibold text-slate-700">{cell.getDate()}</span>
                  <div className="mt-3 min-h-8 space-y-1">
                    {unavailable ? (
                      <StatusLine tone="red" label="Unavailable" />
                    ) : booked ? (
                      <StatusLine tone="blue" label={`${bookingCount} Booking${bookingCount === 1 ? "" : "s"}`} />
                    ) : count ? (
                      <StatusLine tone="green" label={`${count} Slot${count === 1 ? "" : "s"}`} />
                    ) : null}
                    {overridden ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Override
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-5 px-4 py-3 text-xs font-semibold text-slate-500">
            <Legend color="bg-emerald-400" label="Available" />
            <Legend color="bg-blue-400" label="Booking" />
            <Legend color="bg-slate-300" label="Unavailable" />
            {bookingsLoading ? <span>Loading bookings...</span> : null}
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{formatDateLabel(selectedDate)}</h2>
              <div
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                  selectedHasOverride
                    ? "bg-amber-50 text-amber-700"
                    : selectedWeeklySlots.length
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {selectedSourceLabel}
              </div>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="Close">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Weekly recurring schedule
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Changes here repeat every {selectedWeekdayLabel}.
                </p>
              </div>
              <Toggle
                checked={!!selectedWeeklySchedule?.enabled}
                onChange={setSelectedWeeklyEnabled}
              />
            </div>

            <div className="mt-3 space-y-3">
              {!selectedWeeklySchedule?.enabled ? (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No recurring slots for {selectedWeekdayLabel}.
                </div>
              ) : (selectedWeeklySchedule.slots || []).length ? (
                (selectedWeeklySchedule.slots || []).map((slot, index) => (
                  <div key={`${selectedWeekdayKey}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <ClockIcon size={16} className="shrink-0 text-slate-400" />
                    <TimeInput value={slot.from} onChange={(value) => updateWeeklySlot(index, { from: value })} />
                    <span className="text-xs font-semibold text-slate-400">-</span>
                    <TimeInput value={slot.to} onChange={(value) => updateWeeklySlot(index, { to: value })} />
                    <button type="button" onClick={() => removeWeeklySlot(index)} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Remove weekly time slot">
                      <TrashIcon size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  Turned on, but no slots added yet.
                </div>
              )}

              <button
                type="button"
                onClick={addWeeklySlot}
                className="inline-flex h-9 items-center gap-2 text-sm font-bold text-[#0a7a90]"
              >
                <PlusIcon size={15} />
                Add Weekly Slot
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Session types</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose which session modes clients can book.
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {SESSION_TYPE_LABELS.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  <Toggle
                    checked={profile?.sessionTypes?.[item.key] !== false}
                    onChange={(enabled) => setSessionTypeEnabled(item.key, enabled)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Date actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={<BookingsIcon size={15} />} label="Apply to Another Date" onClick={openApplyModal} />
              <ActionButton
                icon={fullEditableWeekHasOverrides ? <TrashIcon size={15} /> : <CopyIcon size={15} />}
                label={fullEditableWeekHasOverrides ? "Remove Week" : "Copy to Week"}
                danger={fullEditableWeekHasOverrides}
                onClick={toggleWeekOverrides}
              />
              <ActionButton icon={<CloseIcon size={15} />} label="Manage Time Off" danger onClick={openTimeOffModal} />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Date override</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedHasOverride ? "Changes here apply only to this date." : "This date is using the weekly recurring schedule."}
                </p>
              </div>
              {selectedHasOverride ? (
                <button
                  type="button"
                  onClick={clearDateOverride}
                  className="shrink-0 text-xs font-bold text-[#0a7a90] hover:underline"
                >
                  Use weekly
                </button>
              ) : (
                <button
                  type="button"
                  onClick={createDateOverride}
                  className="shrink-0 text-xs font-bold text-[#0a7a90] hover:underline"
                >
                  Override
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <span className="text-sm font-bold text-slate-900">Available on this date</span>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedRule.unavailable ? "This date is blocked." : "Clients can book the slots below."}
                </p>
              </div>
              <Toggle checked={!selectedRule.unavailable} onChange={(next) => markUnavailable(!next)} />
            </div>

            <div className="mt-3 space-y-3">
              {selectedRule.unavailable ? (
                <div className="rounded-lg bg-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">
                  This day is marked unavailable.
                </div>
              ) : selectedSlots.length ? (
                selectedSlots.map((slot, index) => (
                  <div key={`${selectedDate}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <ClockIcon size={16} className="shrink-0 text-slate-400" />
                    <TimeInput value={slot.from} onChange={(value) => updateSlot(index, { from: value })} />
                    <span className="text-xs font-semibold text-slate-400">-</span>
                    <TimeInput value={slot.to} onChange={(value) => updateSlot(index, { to: value })} />
                    <button type="button" onClick={() => removeSlot(index)} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Remove time slot">
                      <TrashIcon size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No slots for this date.
                </div>
              )}

              <button
                type="button"
                onClick={addSlot}
                disabled={selectedRule.unavailable}
                className="inline-flex h-9 items-center gap-2 text-sm font-bold text-[#0a7a90] disabled:text-slate-400"
              >
                <PlusIcon size={15} />
                Add Date Slot
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-5 bg-white px-4 pb-1 pt-3">
            <Button onClick={save} loading={saving} className="w-full">
              Save Changes
            </Button>
          </div>
        </aside>
      </div>

      {timeOffModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add time off</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select the slots clients cannot book.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimeOffModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close time off modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-emerald-700">Can change:</span> future dates and slots that have not started yet.
              </div>
              <div>
                <span className="text-red-600">Cannot change:</span> past dates or slots that already started.
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Date
              </span>
              <input
                type="date"
                value={timeOffDate}
                min={todayKey}
                onChange={(event) => loadTimeOffDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
              />
            </label>

            {timeOffDate < todayKey ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
                Past dates can no longer be changed.
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Time off slots</div>
                  <div className="text-xs text-slate-500">
                    Checked slots will be blocked.
                  </div>
                </div>
                {timeOffBaseSlots.length ? (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0a7a90]">
                    <input
                      type="checkbox"
                      checked={allEditableTimeOffSelected}
                      onChange={(event) => toggleAllTimeOffSlots(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#0a7a90]"
                    />
                    All
                  </label>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {timeOffBaseSlots.length ? (
                  timeOffBaseSlots.map((slot, index) => {
                    const editable = isTimeOffSlotEditable(timeOffDate, slot);
                    const checked = editable
                      ? timeOffFullDay || timeOffSlotKeys.includes(slotKey(slot))
                      : timeOffSlotKeys.includes(slotKey(slot));
                    return (
                      <label
                        key={`${timeOffDate}-time-off-${index}`}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
                          editable ? "bg-slate-50 text-slate-800" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!editable}
                          onChange={(event) => toggleTimeOffSlot(slot, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#0a7a90] disabled:opacity-50"
                        />
                        <span className="flex-1">{slot.from} - {slot.to}</span>
                        {!editable ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            Started
                          </span>
                        ) : null}
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No slots on this date. Applying time off will block the full day.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setTimeOffModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={applyTimeOff} disabled={timeOffDate < todayKey}>
                Apply Time Off
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Calendar settings</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Control booking rules for generated availability slots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close calendar settings"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SettingsSelect
                label="Minimum notice"
                value={settings.minNoticeMinutes}
                onChange={(value) => setAvailabilitySetting("minNoticeMinutes", value)}
                options={[
                  [0, "No notice"],
                  [30, "30 minutes"],
                  [60, "1 hour"],
                  [120, "2 hours"],
                  [240, "4 hours"],
                  [1440, "1 day"],
                ]}
              />
              <SettingsSelect
                label="Default duration"
                value={settings.defaultDurationMinutes}
                onChange={(value) => setAvailabilitySetting("defaultDurationMinutes", value)}
                options={[
                  [15, "15 minutes"],
                  [30, "30 minutes"],
                  [45, "45 minutes"],
                  [60, "1 hour"],
                ]}
              />
              <SettingsSelect
                label="Buffer time"
                value={settings.bufferMinutes}
                onChange={(value) => setAvailabilitySetting("bufferMinutes", value)}
                options={[
                  [0, "No buffer"],
                  [5, "5 minutes"],
                  [10, "10 minutes"],
                  [15, "15 minutes"],
                  [30, "30 minutes"],
                ]}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Booking window
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.bookingWindowDays}
                  onChange={(event) => setAvailabilitySetting("bookingWindowDays", Math.max(1, Number(event.target.value) || 1))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
                />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Same-day booking</div>
                  <div className="text-xs text-slate-500">Clients can book slots for today.</div>
                </div>
                <Toggle
                  checked={settings.sameDayBooking}
                  onChange={(enabled) => setAvailabilitySetting("sameDayBooking", enabled)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Auto schedule online</div>
                  <div className="text-xs text-slate-500">Use schedule rules to manage available state.</div>
                </div>
                <Toggle
                  checked={profile?.autoOnlineMode === true}
                  onChange={(enabled) => profile && setProfile({ ...profile, autoOnlineMode: enabled })}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSettingsModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {templatesModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Availability templates</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Save and reuse weekly recurring schedules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close availability templates"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 p-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Template name
                </span>
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Weekday mornings"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
                />
              </label>
              <Button type="button" onClick={createTemplate} className="mt-3 w-full">
                Save Current Weekly Schedule
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {templates.length ? (
                templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{template.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {countTemplateSlots(template.weeklySchedule)} weekly slots
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => applyTemplate(template.id)}>
                      Apply
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(template.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${template.name}`}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-5 text-sm text-slate-500">
                  No templates saved yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {applyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Apply to another date
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This creates a date override using the selected slots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close apply date modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Slots to copy
                </div>
                {selectedSlots.length ? (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0a7a90]">
                    <input
                      type="checkbox"
                      checked={allApplySlotsSelected}
                      onChange={(event) => toggleAllApplySlots(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0a7a90] accent-[#0a7a90]"
                    />
                    All
                  </label>
                ) : null}
              </div>
              <div className="mt-2 space-y-2">
                {selectedSlots.length ? (
                  selectedSlots.map((slot, index) => (
                    <label
                      key={`${selectedDate}-copy-${index}`}
                      className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={applySlotKeys.includes(slotKey(slot))}
                        onChange={(event) => toggleApplySlot(slot, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0a7a90] accent-[#0a7a90]"
                      />
                      <span>{slot.from} - {slot.to}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No slots selected.</div>
                )}
              </div>
              {selectedSlots.length ? (
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {selectedApplySlots.length} of {selectedSlots.length} selected
                </div>
              ) : null}
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Target date
              </span>
              <input
                type="date"
                value={applyDate}
                onChange={(event) => setApplyDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={applyToAnotherDate} disabled={selectedApplySlots.length === 0}>
                Apply Override
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 min-w-0 flex-1 rounded-md border-0 bg-transparent p-0 text-sm font-semibold text-slate-700 outline-none"
    />
  );
}

function ActionButton({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold ${
        danger
          ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className={danger ? "text-red-500" : "text-[#0a7a90]"}>{icon}</span>
      {label}
    </button>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: Array<[number, string]>;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OptionRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
      <span className="text-[#0a7a90]">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRightIcon size={13} className="text-slate-400" />
    </button>
  );
}

function StatusLine({ tone, label }: { tone: "green" | "blue" | "red"; label: string }) {
  const color = tone === "green" ? "bg-emerald-500 text-emerald-700" : tone === "blue" ? "bg-blue-500 text-blue-700" : "bg-red-500 text-red-600";
  const [dot, text] = color.split(" ");
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
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

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function countTemplateSlots(schedule?: Record<string, DaySchedule>) {
  return Object.values(schedule || {}).reduce((total, day) => {
    if (!day?.enabled) return total;
    return total + (day.slots?.length || (day.from && day.to ? 1 : 0));
  }, 0);
}

function formatDateLabel(key: string) {
  return parseDateKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
