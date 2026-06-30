import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./lib/toast";

export const metadata: Metadata = {
  title: "Prophetic Pathway — Advisor",
  description: "Prophetic Pathway advisor dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
