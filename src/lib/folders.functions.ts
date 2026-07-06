import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; color?: string; parent_id?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: data.name,
        color: data.color ?? "#8b5cf6",
        parent_id: data.parent_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; name: string; color?: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { name: data.name };
    if (data.color) patch.color = data.color;
    const { error } = await supabase.from("folders").update(patch as never).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("folders").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
