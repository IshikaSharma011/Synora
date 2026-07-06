import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listFolders, createFolder, deleteFolder, renameFolder } from "@/lib/folders.functions";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/folders")({
  head: () => ({ meta: [{ title: "Folders — Smart Notes" }] }),
  component: FoldersPage,
});

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function FoldersPage() {
  const list = useServerFn(listFolders);
  const create = useServerFn(createFolder);
  const del = useServerFn(deleteFolder);
  const rename = useServerFn(renameFolder);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const { data: folders } = useQuery({ queryKey: ["folders"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["folders"] });

  const createM = useMutation({
    mutationFn: () => create({ data: { name, color } }),
    onSuccess: () => { setName(""); toast.success("Folder created"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Folder deleted"); refresh(); },
  });
  const renameM = useMutation({
    mutationFn: (v: { id: string; name: string }) => rename({ data: v }),
    onSuccess: refresh,
  });

  return (
    <Window title="Folders">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) createM.mutate(); }}
        className="flex flex-wrap gap-2 mb-4"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder name"
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

      {!folders?.length ? (
        <p className="text-sm text-muted-foreground">No folders yet. Create one to organize your notes.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-window-border bg-card/95 p-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: f.color + "33" }}>
                <Folder className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <Link to="/notes" className="flex-1 font-semibold truncate hover:text-primary">{f.name}</Link>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => {
                const n = prompt("Rename folder", f.name);
                if (n && n !== f.name) renameM.mutate({ id: f.id, name: n });
              }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive" onClick={() => {
                if (confirm(`Delete folder "${f.name}"? Notes will move to no folder.`)) delM.mutate(f.id);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
