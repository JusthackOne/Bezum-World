import { Header } from "@/widgets/layout/header/header";
import { Sidebar } from "@/widgets/layout/sidebar/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[220px_1fr]">
        <Sidebar />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
