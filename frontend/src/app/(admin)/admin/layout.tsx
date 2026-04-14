import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "@/styles/globals.css";
import { AdminPanelGuard } from "@/features/auth/ui";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { SidebarProvider } from "@/shared/ui/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bezum World Frontend",
  description: "Frontend blueprint for the Social RPG project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <QueryProvider>
            <SidebarProvider>
              <AdminPanelGuard>{children}</AdminPanelGuard>
            </SidebarProvider>
          </QueryProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
