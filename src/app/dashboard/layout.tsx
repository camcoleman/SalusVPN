import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Dashboard | SalusVPN",
  description:
    "Browse relay nodes, inspect trust scores, and monitor sessions and payments.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <Navbar variant="dashboard" />
      {children}
    </div>
  );
}
