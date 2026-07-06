import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/desktop/SignOutButton";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Smart Notes" }] }),
  component: SettingsPage,
});

type Theme = "light" | "dark" | "system";
type FontSize = "sm" | "base" | "lg";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}
function applyFontSize(size: FontSize) {
  const map = { sm: "14px", base: "16px", lg: "18px" };
  document.documentElement.style.fontSize = map[size];
}

function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "system");
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem("fontSize") as FontSize) || "base");
  const [aiTone, setAiTone] = useState(() => localStorage.getItem("aiTone") || "balanced");

  useEffect(() => { applyTheme(theme); localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { applyFontSize(fontSize); localStorage.setItem("fontSize", fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem("aiTone", aiTone); }, [aiTone]);

  return (
    <div className="space-y-4">
      <Window title="Settings" toolbar={<SignOutButton />}>
        <div className="space-y-6">
          <section>
            <h3 className="font-semibold text-sm mb-2">Appearance</h3>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <Button key={t} size="sm" variant={theme === t ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setTheme(t)}>{t}</Button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Font size</h3>
            <div className="flex gap-2">
              {(["sm", "base", "lg"] as FontSize[]).map((s) => (
                <Button key={s} size="sm" variant={fontSize === s ? "default" : "outline"} className="rounded-full" onClick={() => setFontSize(s)}>
                  {s === "sm" ? "Small" : s === "base" ? "Medium" : "Large"}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">AI preferences</h3>
            <div className="flex gap-2">
              {["concise", "balanced", "detailed"].map((t) => (
                <Button key={t} size="sm" variant={aiTone === t ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setAiTone(t)}>{t}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Used as a hint for AI actions in the editor.</p>
          </section>
        </div>
      </Window>
    </div>
  );
}
