import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[0.9375rem] font-bold transition-[background-color,border-color,box-shadow,color,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
  {
    variants: {
      variant: {
        default: "bg-brand-deep text-primary-foreground hover:bg-brand-deeper",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:border-ink-faint",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
        destructive:
          "border border-brand-deep bg-transparent text-brand hover:bg-brand-tint",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-3.5 text-[0.8125rem] has-[>svg]:px-3",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
