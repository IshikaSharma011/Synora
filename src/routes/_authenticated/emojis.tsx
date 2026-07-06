import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotes } from "@/lib/notes.functions";
import { Window } from "@/components/desktop/Window";

export const Route = createFileRoute("/_authenticated/emojis")({
  head: () => ({ meta: [{ title: "Emojis — Smart Notes" }] }),
  component: EmojisPage,
});

function EmojisPage() {
  const list = useServerFn(listNotes);
  const { data: notes } = useQuery({
    queryKey: ["notes", "all-with-emoji"],
    queryFn: () => list({ data: { filter: "all", limit: 500 } }),
  });

  const grouped = new Map<string, typeof notes>();
  (notes ?? []).forEach((n) => {
    if (!n.emoji) return;
    const arr = grouped.get(n.emoji) ?? [];
    arr.push(n);
    grouped.set(n.emoji, arr);
  });

  const entries = Array.from(grouped.entries()).sort((a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0));

  return (
    <Window title="Emojis">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add emojis to your notes to browse them by icon here.</p>
      ) : (
        <div className="space-y-5">
          {entries.map(([e, list]) => (
            <div key={e}>
              <div className="text-2xl mb-2">{e} <span className="text-xs text-muted-foreground font-normal">{list!.length} notes</span></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list!.map((n) => (
                  <Link
                    key={n.id}
                    to="/notes/$id"
                    params={{ id: n.id }}
                    className="rounded-xl border border-window-border bg-card/95 p-3 hover:bg-accent transition"
                  >
                    <div className="font-semibold truncate">{n.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {n.content.replace(/[#*`>_~-]/g, "").slice(0, 120)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
