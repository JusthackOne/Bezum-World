import { env } from "@/shared/config/env";
import { SidebarTrigger } from "@/shared/ui";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />

        <div>
          <p className="text-sm font-semibold">{env.NEXT_PUBLIC_APP_NAME}</p>
          <p className="text-xs text-muted-foreground">Frontend Blueprint</p>
        </div>
      </div>
    </header>
  );
}
