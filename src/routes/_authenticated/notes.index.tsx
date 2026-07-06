import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listNotes, createNote, toggleNoteFlag, trashNote } from "@/lib/notes.functions";
import { listFolders } from "@/lib/folders.functions";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pin, Star, Archive, Trash2, MoreHorizontal, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes/")({
  head: () => ({ meta: [{ title: "Notes — Smart Notes" }] }),
  component: NotesPage,
});

type Filter = "all" | "pinned" | "favorite" | "archived";

function NotesPage() {
  const navigate = useNavigate();
  const list = useServerFn(listNotes);
  const foldersFn = useServerFn(listFolders);
  const create = useServerFn(createNote);
  const toggle = useServerFn(toggleNoteFlag);
  const trash = useServerFn(trashNote);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data: notes, isLoading, isError, error: notesError } = useQuery({
    queryKey: ["notes", filter, folderId, search],
    queryFn: () => list({ data: { filter, folder_id: folderId, search } }),
    retry: false,
  });
  const { data: folders } = useQuery({ queryKey: ["folders"], queryFn: () => foldersFn() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notes"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const createM = useMutation({
    mutationFn: () => create({ data: { folder_id: folderId ?? null } }),
    onSuccess: (n) => navigate({ to: "/notes/$id", params: { id: n.id } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create note"),
  });
  const toggleM = useMutation({
    mutationFn: (v: { id: string; field: "is_pinned" | "is_favorite" | "is_archived"; value: boolean }) =>
      toggle({ data: v }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update note"),
  });
  const trashM = useMutation({
    mutationFn: (id: string) => trash({ data: { id } }),
    onSuccess: () => {
      toast.success("Moved to trash");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't move note to trash"),
  });

  return (
    <Window
      title="Notes"
      toolbar={
        <Button size="sm" className="rounded-full" onClick={() => createM.mutate()}>
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 rounded-full"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["all", "pinned", "favorite", "archived"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
        {folders && folders.length > 0 && (
          <select
            className="rounded-full border border-input bg-card px-3 py-1.5 text-sm"
            value={folderId ?? ""}
            onChange={(e) => setFolderId(e.target.value || undefined)}
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-destructive/50 p-10 text-center text-destructive">
          {notesError instanceof Error ? notesError.message : "Couldn't load notes."}
        </div>
      ) : !notes?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No notes here yet.
          <div className="mt-3">
            <Button size="sm" className="rounded-full" onClick={() => createM.mutate()}>
              <Plus className="mr-1 h-4 w-4" /> Create your first note
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <div key={n.id} className="group relative rounded-2xl border border-window-border bg-card/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Link to="/notes/$id" params={{ id: n.id }} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {n.emoji && <span className="text-lg">{n.emoji}</span>}
                    <div className="font-semibold truncate">{n.title || "Untitled"}</div>
                  </div>
                  <div className="flex gap-1 shrink-0 pr-8">
                    {n.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    {n.is_favorite && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                  {n.content.replace(/[#*`>_~-]/g, "").slice(0, 160) || "Empty note"}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>{new Date(n.updated_at).toLocaleDateString()}</span>
                  <span>{n.word_count} words</span>
                </div>
              </Link>
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl">
                    <DropdownMenuItem onClick={() => toggleM.mutate({ id: n.id, field: "is_pinned", value: !n.is_pinned })}>
                      <Pin className="mr-2 h-4 w-4" /> {n.is_pinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleM.mutate({ id: n.id, field: "is_favorite", value: !n.is_favorite })}>
                      <Star className="mr-2 h-4 w-4" /> {n.is_favorite ? "Unfavorite" : "Favorite"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleM.mutate({ id: n.id, field: "is_archived", value: !n.is_archived })}>
                      <Archive className="mr-2 h-4 w-4" /> {n.is_archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => trashM.mutate(n.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Move to trash
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
