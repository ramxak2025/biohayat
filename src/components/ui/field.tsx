import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "min-h-[52px] w-full rounded-[16px] border border-chipline bg-white px-[18px] py-2.5 text-base text-ink " +
  "placeholder:text-ink-faint transition-colors focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "aria-invalid:border-danger disabled:opacity-60";

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
      className={cn("mb-1.5 block text-sm font-medium text-ink", className)}
    >
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[13px] text-danger">{children}</p>;
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
