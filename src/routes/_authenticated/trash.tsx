import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotes, restoreNote, deleteNotePermanent, emptyTrash } from "@/lib/notes.functions";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({ meta: [{ title: "Trash — Smart Notes" }] }),
  component: TrashPage,
});

function TrashPage() {
  const list = useServerFn(listNotes);
  const restore = useServerFn(restoreNote);
  const del = useServerFn(deleteNotePermanent);
  const empty = useServerFn(emptyTrash);
  const qc = useQueryClient();

  const { data: notes } = useQuery({ queryKey: ["notes", "trash"], queryFn: () => list({ data: { filter: "trash" } }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); };

  const restoreM = useMutation({ mutationFn: (id: string) => restore({ data: { id } }), onSuccess: () => { toast.success("Restored"); refresh(); } });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("Deleted forever"); refresh(); } });
  const emptyM = useMutation({ mutationFn: () => empty(), onSuccess: () => { toast.success("Trash emptied"); refresh(); } });

  return (
    <Window
      title="Trash"
      toolbar={
        notes?.length ? (
          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => confirm("Permanently delete all notes in trash?") && emptyM.mutate()}>
            Empty trash
          </Button>
        ) : null
      }
    >
      {!notes?.length ? (
        <p className="text-sm text-muted-foreground">Trash is empty.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-xl border border-window-border bg-card/95 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{n.emoji} {n.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">Trashed {n.trashed_at ? new Date(n.trashed_at).toLocaleDateString() : ""}</div>
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => restoreM.mutate(n.id)}>
                <RotateCcw className="mr-1 h-4 w-4" /> Restore
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive"
                onClick={() => confirm("Delete this note permanently?") && delM.mutate(n.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
