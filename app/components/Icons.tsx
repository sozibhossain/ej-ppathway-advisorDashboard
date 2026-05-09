"use client";

import { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const wrap = (children: React.ReactNode, p: P) => {
  const { size = 20, className = "", ...rest } = p;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
};

export const DashboardIcon = (p: P) =>
  wrap(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>,
    p
  );

export const SessionsIcon = (p: P) =>
  wrap(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>,
    p
  );

export const BookingsIcon = (p: P) =>
  wrap(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>,
    p
  );

export const WalletIcon = (p: P) =>
  wrap(
    <>
      <path d="M19 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2z" />
      <path d="M16 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v2" />
      <circle cx="17" cy="13" r="1" />
    </>,
    p
  );

export const SettingsIcon = (p: P) =>
  wrap(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>,
    p
  );

export const BellIcon = (p: P) =>
  wrap(
    <>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </>,
    p
  );

export const SearchIcon = (p: P) =>
  wrap(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </>,
    p
  );

export const CloseIcon = (p: P) =>
  wrap(<path d="M18 6L6 18M6 6l12 12" />, p);

export const ChevronRightIcon = (p: P) =>
  wrap(<polyline points="9 18 15 12 9 6" />, p);

export const ChevronLeftIcon = (p: P) =>
  wrap(<polyline points="15 18 9 12 15 6" />, p);

export const ChevronDownIcon = (p: P) =>
  wrap(<polyline points="6 9 12 15 18 9" />, p);

export const PlusIcon = (p: P) =>
  wrap(
    <>
      <path d="M12 5v14M5 12h14" />
    </>,
    p
  );

export const TrashIcon = (p: P) =>
  wrap(
    <>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>,
    p
  );

export const PencilIcon = (p: P) =>
  wrap(
    <>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>,
    p
  );

export const EyeIcon = (p: P) =>
  wrap(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    p
  );

export const EyeOffIcon = (p: P) =>
  wrap(
    <>
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a19.66 19.66 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a19.66 19.66 0 01-3.17 4.5M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
    </>,
    p
  );

export const StarIcon = (p: P & { filled?: boolean }) => {
  const { filled, ...rest } = p;
  return wrap(
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill={filled ? "#facc15" : "none"}
      stroke={filled ? "#facc15" : "currentColor"}
    />,
    rest
  );
};

export const PhoneIcon = (p: P) =>
  wrap(
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />,
    p
  );

export const MailIcon = (p: P) =>
  wrap(
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>,
    p
  );

export const MapPinIcon = (p: P) =>
  wrap(
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
      <circle cx="12" cy="10" r="3" />
    </>,
    p
  );

export const UserIcon = (p: P) =>
  wrap(
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>,
    p
  );

export const LockIcon = (p: P) =>
  wrap(
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>,
    p
  );

export const ClockIcon = (p: P) =>
  wrap(
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>,
    p
  );

export const VideoIcon = (p: P) =>
  wrap(
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </>,
    p
  );

export const ChatIcon = (p: P) =>
  wrap(
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    p
  );

export const SendIcon = (p: P) =>
  wrap(
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>,
    p
  );

export const MaximizeIcon = (p: P) =>
  wrap(
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </>,
    p
  );

export const MicIcon = (p: P) =>
  wrap(
    <>
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </>,
    p
  );

export const MicOffIcon = (p: P) =>
  wrap(
    <>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </>,
    p
  );

export const CameraIcon = (p: P) =>
  wrap(
    <>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </>,
    p
  );

export const TrendIcon = (p: P) =>
  wrap(
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>,
    p
  );

export const UploadIcon = (p: P) =>
  wrap(
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>,
    p
  );

export const LogoutIcon = (p: P) =>
  wrap(
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>,
    p
  );

export const CrownIcon = (p: P) =>
  wrap(
    <>
      <path d="M2 19h20l-2-12-5 4-3-7-3 7-5-4-2 12z" />
    </>,
    p
  );

export const DownloadIcon = (p: P) =>
  wrap(
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>,
    p
  );

export const FileIcon = (p: P) =>
  wrap(
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>,
    p
  );

export const ZapIcon = (p: P) =>
  wrap(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />, p);

export const AwardIcon = (p: P) =>
  wrap(
    <>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </>,
    p
  );

export const ArrowLeftIcon = (p: P) =>
  wrap(
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>,
    p
  );

export const ArrowRightIcon = (p: P) =>
  wrap(
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>,
    p
  );

export const CheckIcon = (p: P) =>
  wrap(<polyline points="20 6 9 17 4 12" />, p);

export const PaperclipIcon = (p: P) =>
  wrap(
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />,
    p
  );
