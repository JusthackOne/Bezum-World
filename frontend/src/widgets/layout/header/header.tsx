import { env } from "@/shared/config/env";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div>
        <p className="text-sm font-semibold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <p className="text-xs text-muted-foreground">Frontend Blueprint</p>
      </div>
    </header>
  );
}
