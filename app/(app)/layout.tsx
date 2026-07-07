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
    <div className="min-h-screen bg-[#f8fafc]">
      <Topbar />
      <main className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 pt-24 md:ml-64">
        {children}
      </main>
    </div>
  );
}
