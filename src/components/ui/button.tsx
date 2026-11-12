import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-mist hover:bg-slope active:bg-ink disabled:border disabled:border-dashed disabled:border-chipline disabled:bg-transparent disabled:text-ink-muted",
  accent:
    "bg-grass text-ink hover:bg-stone",
  secondary: "bg-surface-sunken text-ink hover:bg-line-strong",
  outline: "border border-line-strong bg-surface text-ink hover:bg-surface-soft",
  ghost: "text-ink hover:bg-surface-soft",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm gap-1.5",
  md: "min-h-11 px-5 text-[15px] gap-2",
  lg: "min-h-14 px-7 text-base gap-2.5",
  icon: "h-11 w-11",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-[160ms]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-color,var(--ink))]",
          "disabled:cursor-not-allowed disabled:opacity-70 select-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
