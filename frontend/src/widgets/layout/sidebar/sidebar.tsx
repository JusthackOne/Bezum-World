const SIDEBAR_NAV_ITEMS = ["Dashboard Stub", "Tasks Stub", "Battles Stub", "Profile Stub"];

export function Sidebar() {
  return (
    <aside className="hidden border-r bg-card/30 p-4 md:block">
      <nav className="space-y-2">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <div key={item} className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            {item}
          </div>
        ))}
      </nav>
    </aside>
  );
}
