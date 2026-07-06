import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, listNotes } from "@/lib/notes.functions";
import { Window } from "@/components/desktop/Window";
import { SignOutButton } from "@/components/desktop/SignOutButton";
import { Pin, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Notes" }] }),
  component: DashboardPage,
});

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-window-border bg-card/95 p-5 shadow-sm">
      <div className="text-sm font-semibold text-muted-foreground">{label}</div>
      <div className="mt-3 text-4xl sm:text-5xl font-bold text-primary">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function NoteCard({ note }: { note: { id: string; title: string; emoji: string | null; content: string; is_pinned: boolean; is_favorite: boolean; updated_at: string } }) {
  return (
    <Link
      to="/notes/$id"
      params={{ id: note.id }}
      className="block rounded-2xl border border-window-border bg-card/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {note.emoji && <span className="text-lg">{note.emoji}</span>}
          <div className="font-semibold truncate">{note.title || "Untitled"}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
          {note.is_favorite && <Star className="h-3.5 w-3.5 text-yellow-500" />}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
        {note.content.replace(/[#*`>_~-]/g, "").slice(0, 160) || "Empty note"}
      </p>
      <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
        {new Date(note.updated_at).toLocaleDateString()}
      </div>
    </Link>
  );
}

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchNotes = useServerFn(listNotes);
  const { data: stats, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const { data: recent } = useQuery({ queryKey: ["notes", "recent"], queryFn: () => fetchNotes({ data: { filter: "recent", limit: 6 } }) });
  const { data: pinned } = useQuery({ queryKey: ["notes", "pinned"], queryFn: () => fetchNotes({ data: { filter: "pinned", limit: 4 } }) });
  const { data: favorites } = useQuery({ queryKey: ["notes", "favorite"], queryFn: () => fetchNotes({ data: { filter: "favorite", limit: 4 } }) });

  return (
    <div className="space-y-5">
      <Window
        title="Dashboard"
        toolbar={
          <>
            <Link to="/notes">
              <Button size="sm" variant="outline" className="rounded-full">
                <Plus className="mr-1 h-4 w-4" /> New note
              </Button>
            </Link>
            <SignOutButton />
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Notes" value={isLoading ? "—" : stats!.totalNotes} />
          <StatCard label="Tags" value={isLoading ? "—" : stats!.totalTags} />
          <StatCard label="Archived" value={isLoading ? "—" : stats!.archivedNotes} />
          <StatCard label="In Trash" value={isLoading ? "—" : stats!.trashedNotes} />
        </div>
      </Window>

      <Window title="Pinned">
        {!pinned?.length ? (
          <p className="text-sm text-muted-foreground">Pin your most important notes to see them here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pinned.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </Window>

      <Window title="Favorites">
        {!favorites?.length ? (
          <p className="text-sm text-muted-foreground">Star notes you love — they'll show up here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </Window>

      <Window title="Recent">
        {!recent?.length ? (
          <p className="text-sm text-muted-foreground">Create your first note to get started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </Window>
    </div>
  );
}
