import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, StickyNote, Search, Folder, Tag, Smile, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, grad: "var(--gradient-icon-purple)" },
  { to: "/notes", label: "Notes", icon: StickyNote, grad: "var(--gradient-icon-yellow)" },
  { to: "/search", label: "Search", icon: Search, grad: "var(--gradient-icon-blue)" },
  { to: "/folders", label: "Folders", icon: Folder, grad: "var(--gradient-icon-green)" },
  { to: "/tags", label: "Tags", icon: Tag, grad: "var(--gradient-icon-pink)" },
  { to: "/emojis", label: "Emojis", icon: Smile, grad: "var(--gradient-icon-yellow)" },
  { to: "/trash", label: "Trash", icon: Trash2, grad: "var(--gradient-icon-pink)" },
  { to: "/settings", label: "Settings", icon: Settings, grad: "var(--gradient-icon-blue)" },
] as const;

export function Dock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <nav className="dock-surface pointer-events-auto flex items-end gap-2 px-4 py-2.5 overflow-x-auto max-w-[calc(100vw-2rem)]">
        {items.map(({ to, label, icon: Icon, grad }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col items-center shrink-0"
              aria-label={label}
              title={label}
            >
              <span
                className={cn(
                  "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-200",
                  "group-hover:-translate-y-1 group-hover:scale-110",
                  active && "-translate-y-1 scale-105",
                )}
                style={{
                  background: grad,
                  boxShadow:
                    "0 10px 24px -8px oklch(0.2 0.05 250 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.5)",
                }}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
              </span>
              {active && (
                <span
                  className="mt-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: "oklch(0.3 0.02 260)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
