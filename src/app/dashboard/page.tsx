import { SessionSelectionProvider } from "@/context/SessionSelectionContext";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardPage() {
  return (
    <SessionSelectionProvider>
      <DashboardShell />
    </SessionSelectionProvider>
  );
}
