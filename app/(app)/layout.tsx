"use client";

import { useAuth } from "../lib/auth-context";
import { Topbar } from "../components/Topbar";
import { PageSpinner } from "../components/ui/Spinner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
