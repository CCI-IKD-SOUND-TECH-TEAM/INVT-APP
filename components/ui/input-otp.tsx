"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";

import { cn } from "@/lib/utils";

/**
 * shadcn input-otp, restyled for this design system:
 *  - slot chrome matches components/ui/input.tsx (surface-sunken fill, border,
 *    brand focus ring) instead of the stock neutral theme
 *  - `shadow-xs` dropped per DESIGN.md's No-Shadow Rule — blur is invisible on
 *    true black and reads as a rendering bug
 *  - the stock separator's lucide-react icon is replaced with a plain rule;
 *    this project ships tabler + heroicons, and lucide isn't a dependency
 */

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        // Sized to match Input's h-11 so the OTP row sits on the same rhythm
        // as the email field it replaces.
        "relative flex h-13 w-full items-center justify-center rounded-md border border-border bg-surface-sunken",
        "font-display text-[1.375rem] text-foreground tabular-nums",
        "transition-[border-color,box-shadow] duration-150 ease-out outline-none",
        "data-[active=true]:z-10 data-[active=true]:border-brand data-[active=true]:ring-3 data-[active=true]:ring-ring/25",
        "aria-invalid:border-brand",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className={cn("h-px w-2 shrink-0 bg-line", className)}
      {...props}
    />
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
