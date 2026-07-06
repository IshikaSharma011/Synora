import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WindowProps {
  title?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: "var(--tl-red)", boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.1)" }}
      />
      <span
        className="h-3 w-3 rounded-full opacity-60"
        style={{ backgroundColor: "var(--tl-yellow)", boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.1)" }}
      />
      <span
        className="h-3 w-3 rounded-full opacity-60"
        style={{ backgroundColor: "var(--tl-green)", boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.1)" }}
      />
    </div>
  );
}

export function Window({ title, toolbar, children, className, bodyClassName }: WindowProps) {
  return (
    <div className={cn("window-surface grainy overflow-hidden", className)}>
      <div className="flex items-center gap-4 border-b border-window-border/60 px-5 py-3.5">
        <TrafficLights />
        {title && (
          <div className="font-display text-[13px] uppercase tracking-wide text-foreground">
            {title}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>
      <div className={cn("p-5 sm:p-7", bodyClassName)}>{children}</div>
    </div>
  );
}
