import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

import {
  Card as ShadcnCard,
  CardAction as ShadcnCardAction,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from "@/shared/ui/card";

import "@/shared/ui/8bit/styles/retro.css";

export const cardVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitCardProps
  extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

function Card({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "relative border-y-6 border-foreground bg-card p-0! text-card-foreground dark:border-ring",
        className,
      )}
    >
      <ShadcnCard
        {...props}
        className={cn(
          "flex h-full w-full! flex-col rounded-none border-0 bg-card text-card-foreground shadow-none",
          font !== "normal" && "retro",
          className,
        )}
      />

      <div
        className={cn("pointer-events-none absolute inset-0 -mx-1.5 border-x-6 border-inherit")}
        aria-hidden="true"
      />
    </div>
  );
}

function CardHeader({ ...props }: BitCardProps) {
  const { className, font } = props;

  return <ShadcnCardHeader className={cn(font !== "normal" && "retro", className)} {...props} />;
}

function CardTitle({ ...props }: BitCardProps) {
  const { className, font } = props;

  return <ShadcnCardTitle className={cn(font !== "normal" && "retro", className)} {...props} />;
}

function CardDescription({ ...props }: BitCardProps) {
  const { className, font } = props;

  return (
    <ShadcnCardDescription className={cn(font !== "normal" && "retro", className)} {...props} />
  );
}

function CardAction({ ...props }: BitCardProps) {
  const { className, font } = props;

  return <ShadcnCardAction className={cn(font !== "normal" && "retro", className)} {...props} />;
}

function CardContent({ ...props }: BitCardProps) {
  const { className, font } = props;

  return (
    <ShadcnCardContent
      className={cn("flex-1", font !== "normal" && "retro", className)}
      {...props}
    />
  );
}

function CardFooter({ ...props }: BitCardProps) {
  const { className, font } = props;

  return (
    <ShadcnCardFooter
      data-slot="card-footer"
      className={cn(font !== "normal" && "retro", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
