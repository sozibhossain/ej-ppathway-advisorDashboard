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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
