import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTags, createTag, deleteTag, updateTag } from "@/lib/tags.functions";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tags")({
  head: () => ({ meta: [{ title: "Tags — Smart Notes" }] }),
  component: TagsPage,
});

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function TagsPage() {
  const list = useServerFn(listTags);
  const create = useServerFn(createTag);
  const del = useServerFn(deleteTag);
  const update = useServerFn(updateTag);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tags"] });

  const createM = useMutation({
    mutationFn: () => create({ data: { name: name.replace(/^#/, ""), color } }),
    onSuccess: () => { setName(""); toast.success("Tag created"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Tag deleted"); refresh(); },
  });

  return (
    <Window title="Tags">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) createM.mutate(); }}
        className="flex flex-wrap gap-2 mb-4"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="new-tag-name"
          className="flex-1 min-w-[180px] rounded-full"
        />
        <div className="flex gap-1 items-center">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-6 w-6 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: color === c ? "black" : "transparent" }}
            />
          ))}
        </div>
        <Button type="submit" size="sm" className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Create</Button>
      </form>

      {!tags?.length ? (
        <p className="text-sm text-muted-foreground">No tags yet. Tags help you filter notes by topic.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-1.5 rounded-full border-2 pl-3 pr-1 py-1 text-sm font-semibold"
              style={{ borderColor: t.color, color: t.color }}
            >
              <Link to="/search" className="hover:underline">#{t.name}</Link>
              <button
                onClick={() => confirm(`Delete tag "${t.name}"?`) && delM.mutate(t.id)}
                className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full flex items-center justify-center hover:bg-black/10"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
