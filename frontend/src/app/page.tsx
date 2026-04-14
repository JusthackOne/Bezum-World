import { AuthStubCard } from "@/features/auth/ui";

export default function HomePage() {
  return (
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Frontend Blueprint</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This page is a stub foundation with no business logic. It demonstrates architecture, UI
            primitives, local state (Zustand), and server state (React Query).
          </p>
        </div>
        <AuthStubCard />
      </section>
  );
}
