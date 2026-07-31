import * as SheetPrimitive from "@radix-ui/react-dialog";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

import {
  Sheet as ShadcnSheet,
  SheetClose as ShadcnSheetClose,
  SheetDescription as ShadcnSheetDescription,
  SheetFooter as ShadcnSheetFooter,
  SheetHeader as ShadcnSheetHeader,
  SheetTitle as ShadcnSheetTitle,
  SheetTrigger as ShadcnSheetTrigger,
} from "@/shared/ui/sheet";

import "@/shared/ui/8bit/styles/retro.css";

const Sheet = ShadcnSheet;

const SheetTrigger = ShadcnSheetTrigger;

const SheetClose = ShadcnSheetClose;

const SheetDescription = ShadcnSheetDescription;

const SheetFooter = ShadcnSheetFooter;

const SheetHeader = ShadcnSheetHeader;

const SheetTitle = ShadcnSheetTitle;

export const sheetVariants = cva("", {
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

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export type BitSheetProps = React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    side?: "top" | "right" | "bottom" | "left";
  };

function SheetContent({ className, children, side = "right", font, ...props }: BitSheetProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          sheetVariants({
            font,
            className,
          }),
        )}
        {...props}
      >
        <div className="relative h-full w-full">
          {children}
          {/* 8 bit borders */}
          {side !== "top" && (
            <div
              className="pointer-events-none absolute top-0 left-0 h-1.5 w-full bg-foreground dark:bg-ring"
              aria-hidden="true"
            />
          )}
          {side !== "bottom" && (
            <div
              className="pointer-events-none absolute bottom-0 h-1.5 w-full bg-foreground dark:bg-ring"
              aria-hidden="true"
            />
          )}
          {side !== "left" && (
            <>
              <div
                className="pointer-events-none absolute top-1 -left-1 h-1/2 w-1.5 bg-foreground dark:bg-ring"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute bottom-1 -left-1 h-1/2 w-1.5 bg-foreground dark:bg-ring"
                aria-hidden="true"
              />
            </>
          )}
          {side !== "right" && (
            <>
              <div
                className="pointer-events-none absolute top-1 -right-1 h-1/2 w-1.5 bg-foreground dark:bg-ring"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -right-1 bottom-1 h-1/2 w-1.5 bg-foreground dark:bg-ring"
                aria-hidden="true"
              />
            </>
          )}
        </div>
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <svg
            width={50}
            height={50}
            viewBox="0 0 256 256"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            strokeWidth={0.25}
            color=""
            className="h-6 w-6"
            aria-label="x"
          >
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 120 152)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 104 168)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 184 184)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 88 184)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 168 104)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 184 88)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 200 72)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 200 200)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 152 120)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 152 152)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 136 136)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 120 120)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 136 136)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 168 168)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 88 88)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 72 72)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 72 200)" />
            <rect width={14} height={14} rx={1} transform="matrix(0 -1 -1 0 104 104)" />
          </svg>
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
};
