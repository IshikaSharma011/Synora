import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function wordCount(text: string) {
  return (text.trim().match(/\S+/g) ?? []).length;
}

export type NoteFilter =
  | "all"
  | "pinned"
  | "favorite"
  | "archived"
  | "trash"
  | "recent";

export const listNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { filter?: NoteFilter; folder_id?: string | null; tag_id?: string; search?: string; limit?: number }) => i,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 200);

    switch (data.filter) {
      case "pinned":
        q = q.eq("is_pinned", true).eq("is_trashed", false);
        break;
      case "favorite":
        q = q.eq("is_favorite", true).eq("is_trashed", false);
        break;
      case "archived":
        q = q.eq("is_archived", true).eq("is_trashed", false);
        break;
      case "trash":
        q = q.eq("is_trashed", true);
        break;
      case "recent":
        q = q.eq("is_trashed", false).eq("is_archived", false);
        break;
      default:
        q = q.eq("is_trashed", false).eq("is_archived", false);
    }

    if (data.folder_id !== undefined) {
      if (data.folder_id === null) q = q.is("folder_id", null);
      else q = q.eq("folder_id", data.folder_id);
    }
    if (data.search && data.search.trim()) {
      const s = data.search.replace(/[%_]/g, "");
      q = q.or(`title.ilike.%${s}%,content.ilike.%${s}%`);
    }

    const { data: notes, error } = await q;
    if (error) throw new Error(error.message);

    if (data.tag_id) {
      const { data: joins } = await supabase
        .from("note_tags")
        .select("note_id")
        .eq("user_id", userId)
        .eq("tag_id", data.tag_id);
      const ids = new Set((joins ?? []).map((j) => j.note_id));
      return (notes ?? []).filter((n) => ids.has(n.id));
    }
    return notes ?? [];
  });

export const getNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!note) throw new Error("Note not found");

    const { data: tagJoins } = await supabase
      .from("note_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("note_id", data.id)
      .eq("user_id", userId);

    return {
      ...note,
      tags: (tagJoins ?? []).map((j) => j.tags).filter(Boolean),
    };
  });

export const createNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { title?: string; content?: string; folder_id?: string | null; emoji?: string | null }) => i,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const content = data.content ?? "";
    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: data.title ?? "Untitled",
        content,
        folder_id: data.folder_id ?? null,
        emoji: data.emoji ?? null,
        word_count: wordCount(content),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return note;
  });

export const updateNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      id: string;
      title?: string;
      content?: string;
      folder_id?: string | null;
      emoji?: string | null;
    }) => i,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) {
      patch.content = data.content;
      patch.word_count = wordCount(data.content);
    }
    if (data.folder_id !== undefined) patch.folder_id = data.folder_id;
    if (data.emoji !== undefined) patch.emoji = data.emoji;

    const { data: note, error } = await supabase
      .from("notes")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return note;
  });

export const toggleNoteFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { id: string; field: "is_pinned" | "is_favorite" | "is_archived"; value: boolean }) => i,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = { [data.field]: data.value } as Record<string, boolean>;
    const { error } = await supabase
      .from("notes")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const trashNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notes")
      .update({ is_trashed: true, trashed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notes")
      .update({ is_trashed: false, trashed_at: null })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotePermanent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const emptyTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("user_id", userId)
      .eq("is_trashed", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setNoteTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { note_id: string; tag_ids: string[] }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("note_tags").delete().eq("note_id", data.note_id).eq("user_id", userId);
    if (data.tag_ids.length) {
      const rows = data.tag_ids.map((tid) => ({
        note_id: data.note_id,
        tag_id: tid,
        user_id: userId,
      }));
      const { error } = await supabase.from("note_tags").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [total, archived, tags, pinned, favorite, trashed] = await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_trashed", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_archived", true).eq("is_trashed", false),
      supabase.from("tags").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_pinned", true).eq("is_trashed", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_favorite", true).eq("is_trashed", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_trashed", true),
    ]);
    return {
      totalNotes: total.count ?? 0,
      archivedNotes: archived.count ?? 0,
      totalTags: tags.count ?? 0,
      pinnedNotes: pinned.count ?? 0,
      favoriteNotes: favorite.count ?? 0,
      trashedNotes: trashed.count ?? 0,
    };
  });
