import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "placeholder:text-ink-faint transition-colors focus:border-brand-400 focus:outline-none " +
  "focus:ring-2 focus:ring-brand-100 disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[100px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, "cursor-pointer", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  children,
  htmlFor,
  className,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-sm font-semibold text-ink", className)}
    >
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-danger">{children}</p>;
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-5 w-5 shrink-0 cursor-pointer rounded-md border-line-strong text-brand-500 accent-brand-500 focus:ring-brand-300",
        className,
      )}
      {...props}
    />
  );
}
