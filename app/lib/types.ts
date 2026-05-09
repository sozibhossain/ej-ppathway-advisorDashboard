export type Role = "user" | "advisor" | "admin" | "sub_admin";

export type Tier = "bronze" | "silver" | "gold";

export type AdvisorUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  profilePhoto?: string;
  location?: string;
  language?: string;
  timezone?: string;
  isVerified: boolean;
  status: string;
  notifPrefs?: {
    email?: boolean;
    newSessions?: boolean;
    newMessages?: boolean;
    paymentUpdates?: boolean;
    push?: boolean;
  };
  stripeConnectId?: string;
  stripeConnectVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DaySchedule = {
  enabled: boolean;
  from: string;
  to: string;
};

export type AdvisorPricing = {
  chatPerMin: number;
  callPerMin: number;
  videoPerMin: number;
};

export type AdvisorPromotion = {
  plan?: "basic" | "pro" | "premium";
  startsAt?: string;
  expiresAt?: string;
  impressions?: number;
  profileViews?: number;
  clicks?: number;
  newClients?: number;
};

export type AdvisorProfile = {
  _id: string;
  user: string;
  professionalTitle?: string;
  bio?: string;
  detailedDescription?: string;
  yearsOfExperience?: string;
  expertise: string[];
  styles: string[];
  languages: string[];
  introVideoUrl?: string;
  pricing: AdvisorPricing;
  autoOnlineMode?: boolean;
  weeklySchedule?: Record<string, DaySchedule>;
  isOnline?: boolean;
  lastSeenAt?: string;
  tier: Tier;
  totalSessions?: number;
  completedSessions?: number;
  cancelledSessions?: number;
  repeatClientRate?: number;
  avgResponseSec?: number;
  refundRate?: number;
  avgRating?: number;
  ratingsCount?: number;
  ratingBreakdown?: Record<string, number>;
  grossEarnings?: number;
  netEarnings?: number;
  pendingEarnings?: number;
  activePromotion?: AdvisorPromotion;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionType = "chat" | "call" | "video";
export type SessionStatus =
  | "pending"
  | "consent"
  | "waiting"
  | "live"
  | "completed"
  | "cancelled"
  | "no_show"
  | "flagged"
  | "disputed";

export type SessionDoc = {
  _id: string;
  sessionCode?: string;
  user: { _id: string; name: string; profilePhoto?: string } | string;
  advisor: { _id: string; name: string; profilePhoto?: string } | string;
  type: SessionType;
  status: SessionStatus;
  scheduledFor?: string;
  durationMinutes?: number;
  instantStart?: boolean;
  livekitRoom?: string;
  startedAt?: string;
  endedAt?: string;
  ratePerMin: number;
  estimatedCost?: number;
  chargedAmount?: number;
  advisorPayout?: number;
  cancelReason?: string;
  cancelledAt?: string;
  recordingConsented?: boolean;
  tipAmount?: number;
  advisorNotes?: string;
  review?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ReviewDoc = {
  _id: string;
  user: { _id: string; name: string; profilePhoto?: string } | string;
  advisor: string;
  session?: { _id: string; type?: SessionType };
  rating: number;
  comment?: string;
  ratings?: {
    accuracy?: number;
    clarity?: number;
    helpfulness?: number;
    valuable?: number;
    communication?: number;
    professionalism?: number;
    valueForMoney?: number;
    expertise?: number;
  };
  createdAt: string;
};

export type NotificationDoc = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
};

export type TransactionDoc = {
  _id: string;
  type: string;
  status: string;
  user?: { _id: string; name: string; profilePhoto?: string } | string;
  advisor?: { _id: string; name: string; profilePhoto?: string } | string;
  session?: { _id: string; sessionCode?: string; type?: SessionType; durationMinutes?: number } | string;
  amount: number;
  description?: string;
  withdrawalStatus?: string;
  withdrawalRequestedAt?: string;
  createdAt: string;
};

export type WalletDoc = {
  _id: string;
  user: string;
  balance?: number;
  freeCredits?: number;
  earningsBalance?: number;
  pendingPayouts?: number;
  totalEarned?: number;
};

export type DashboardData = {
  earningsToday: number;
  activeSessions: number;
  pendingRequests: number;
  ratings: number;
  tier: Tier;
  walletBalance: number;
  ongoing?: SessionDoc | null;
  upcoming: SessionDoc[];
  recentReviews: ReviewDoc[];
  earningsCurve: { _id: number; total: number }[];
  stats: {
    avgRating: number;
    repeatClientRate: number;
    refundRate: number;
    sessionCompletion: number;
    completedSessions: number;
    cancelledSessions: number;
  };
};

export type PerformanceData = {
  avgRating: number;
  repeatRate: number;
  avgResponseSec: number;
  refundRate: number;
  ratingBreakdown: Record<string, number>;
  retention: { "1-3": number; "4-9": number; "10+": number };
  tier: Tier;
  tierConfig?: {
    bronze?: { sessions: number; rating: number; retention: number };
    silver?: { sessions: number; rating: number; retention: number };
    gold?: { sessions: number; rating: number; retention: number };
  };
};

export type EarningsOverview = {
  wallet: WalletDoc;
  todayEarnings: number;
  todayWithdrawals: number;
  revenueCurve: { _id: number; total: number }[];
  grossEarnings: number;
  platformFee: number;
  netEarnings: number;
  totalWithdrawn: number;
};

export type PromotionPlanDef = {
  price: number;
  days: number;
  visibilityBoost?: number;
  impressionsPerDay?: number | string;
  features?: string[];
};

export type PromotionPlans = {
  basic: PromotionPlanDef;
  pro: PromotionPlanDef;
  premium: PromotionPlanDef;
};

export type ChatDoc = {
  _id: string;
  kind: "session" | "admin";
  participants: { _id: string; name: string; profilePhoto?: string; role?: string }[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCounts?: Record<string, number>;
  session?: string;
};

export type MessageDoc = {
  _id: string;
  chat: string;
  sender: { _id: string; name: string; profilePhoto?: string; role?: string } | string;
  text: string;
  attachments?: string[];
  createdAt: string;
  readBy?: string[];
};
