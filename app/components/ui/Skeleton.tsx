import { ComponentProps } from "react";

export function Skeleton({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={`bg-slate-200/70 animate-pulse rounded-md ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 ${className}`}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
        >
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-3 w-24 mt-3" />
          <Skeleton className="h-8 w-32 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center gap-4"
        >
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="px-6 md:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <StatGridSkeleton count={4} />
      <ListSkeleton count={5} />
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="min-h-screen w-full flex">
      <div className="w-64 bg-white border-r border-slate-100 p-4 space-y-3 hidden md:block">
        <Skeleton className="h-10 w-3/4" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <PageSkeleton />
      </div>
    </div>
  );
}
