import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listNotes } from "@/lib/notes.functions";
import { listTags } from "@/lib/tags.functions";
import { Window } from "@/components/desktop/Window";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Smart Notes" }] }),
  component: SearchPage,
});

function SearchPage() {
  const list = useServerFn(listNotes);
  const tagsFn = useServerFn(listTags);
  const [q, setQ] = useState("");
  const [tagId, setTagId] = useState<string | undefined>(undefined);

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => tagsFn() });
  const { data: results, isFetching } = useQuery({
    queryKey: ["search", q, tagId],
    queryFn: () => list({ data: { filter: "all", search: q, tag_id: tagId } }),
    enabled: q.trim().length > 0 || !!tagId,
  });

  return (
    <Window title="Search">
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles and contents..."
          className="pl-9 rounded-full"
        />
      </div>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant={!tagId ? "default" : "outline"} className="rounded-full" onClick={() => setTagId(undefined)}>All tags</Button>
          {tags.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tagId === t.id ? "default" : "outline"}
              className="rounded-full"
              style={tagId === t.id ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}
              onClick={() => setTagId(tagId === t.id ? undefined : t.id)}
            >
              #{t.name}
            </Button>
          ))}
        </div>
      )}

      {!q.trim() && !tagId ? (
        <p className="text-sm text-muted-foreground">Type to search your notes.</p>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : !results?.length ? (
        <p className="text-sm text-muted-foreground">No matches.</p>
      ) : (
        <div className="space-y-2">
          {results.map((n) => (
            <Link
              key={n.id}
              to="/notes/$id"
              params={{ id: n.id }}
              className="block rounded-xl border border-window-border bg-card/95 p-3 hover:bg-accent transition"
            >
              <div className="flex items-center gap-2 font-semibold">
                {n.emoji && <span>{n.emoji}</span>}
                {n.title || "Untitled"}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {n.content.replace(/[#*`>_~-]/g, "").slice(0, 200)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Window>
  );
}
