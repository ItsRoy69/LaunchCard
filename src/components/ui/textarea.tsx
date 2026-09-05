import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-fg",
        "placeholder:text-subtle transition-[border-color,box-shadow] duration-quick",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-border-strong",
        "resize-y disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
