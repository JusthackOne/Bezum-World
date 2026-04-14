import type { LucideProps } from "lucide-react";

export function GameScoreIcon({ className, ...props }: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 1.5 3.2 3.5.4-2.6 2.4.7 3.5L12 14.7 8.9 16.5l.7-3.5L7 10.6l3.5-.4L12 7Z" />
    </svg>
  );
}
