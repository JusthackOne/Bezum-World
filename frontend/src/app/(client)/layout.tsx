import { ClientPanelGuard } from "@/features/auth/ui";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientPanelGuard>{children}</ClientPanelGuard>;
}
