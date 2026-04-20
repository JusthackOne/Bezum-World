"use client";

import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { toast as sonnerToast } from "sonner";

import { cn } from "@/shared/lib/utils";
import {
  Toast as ShadcnToast,
  ToastDescription as ShadcnToastDescription,
  ToastProvider as ShadcnToastProvider,
  ToastTitle as ShadcnToastTitle,
  ToastViewport as ShadcnToastViewport,
} from "@/shared/ui/toast";

import "@/shared/ui/8bit/styles/retro.css";

export function toast(toast: string) {
  return sonnerToast.custom(() => (
    <div
      className={cn(
        toastVariants(),
        "rounded-none border-y-6 border-foreground bg-background p-4 text-foreground shadow-lg dark:border-ring",
      )}
    >
      <div
        className="absolute inset-0 -mx-1.5 border-x-6 border-inherit pointer-events-none"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">{toast}</p>
    </div>
  ));
}

const toastVariants = cva("", {
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

type ToastFont = VariantProps<typeof toastVariants>["font"];

interface BitToastProps extends React.ComponentProps<typeof ShadcnToast> {
  font?: ToastFont;
}

interface BitToastTextProps extends React.ComponentProps<"div"> {
  font?: ToastFont;
}

function Toast({ className, font, ...props }: BitToastProps) {
  return (
    <ShadcnToast
      className={cn(
        "relative rounded-none border-y-6 border-foreground bg-card text-card-foreground p-4 dark:border-ring",
        toastVariants({ font }),
        className,
      )}
      {...props}
    />
  );
}

const ToastProvider = ShadcnToastProvider;

function ToastViewport({ className, ...props }: React.ComponentProps<typeof ShadcnToastViewport>) {
  return <ShadcnToastViewport className={cn(className, toastVariants())} {...props} />;
}

function ToastTitle({ className, font, ...props }: BitToastTextProps) {
  return (
    <ShadcnToastTitle
      className={cn(toastVariants({ font }), className)}
      {...(props as React.ComponentProps<typeof ShadcnToastTitle>)}
    />
  );
}

function ToastDescription({ className, font, ...props }: BitToastTextProps) {
  return (
    <ShadcnToastDescription
      className={cn(toastVariants({ font }), className)}
      {...(props as React.ComponentProps<typeof ShadcnToastDescription>)}
    />
  );
}

export { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport };
