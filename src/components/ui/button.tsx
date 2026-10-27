import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Source-owned button: shadcn directory/API convention, original warehouse styles. */
export function Button({
  className,
  variant = "secondary",
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "subtle" | "text";
}) {
  return (
    <button
      className={cn("button", `button-${variant}`, className)}
      {...props}
    />
  );
}
