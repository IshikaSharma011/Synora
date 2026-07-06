
-- Drop old Instagram tables
DROP TABLE IF EXISTS public.dm_logs CASCADE;
DROP TABLE IF EXISTS public.dm_events CASCADE;
DROP TABLE IF EXISTS public.keyword_rules CASCADE;
DROP TABLE IF EXISTS public.instagram_accounts CASCADE;

-- Folders
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY folders_own ON public.folders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX folders_user_idx ON public.folders(user_id);
CREATE TRIGGER folders_touch BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_own ON public.tags FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  emoji TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_trashed BOOLEAN NOT NULL DEFAULT false,
  trashed_at TIMESTAMPTZ,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_own ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notes_user_updated_idx ON public.notes(user_id, updated_at DESC);
CREATE INDEX notes_user_folder_idx ON public.notes(user_id, folder_id);
CREATE INDEX notes_search_idx ON public.notes USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));
CREATE TRIGGER notes_touch BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Note <-> Tag join
CREATE TABLE public.note_tags (
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_tags TO authenticated;
GRANT ALL ON public.note_tags TO service_role;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY note_tags_own ON public.note_tags FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX note_tags_tag_idx ON public.note_tags(tag_id);

-- Note versions (for later restore)
CREATE TABLE public.note_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_versions TO authenticated;
GRANT ALL ON public.note_versions TO service_role;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY note_versions_own ON public.note_versions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX note_versions_note_idx ON public.note_versions(note_id, created_at DESC);

-- AI conversations / messages (per note)
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_conv_own ON public.ai_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_conv_touch BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_msg_own ON public.ai_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_msg_conv_idx ON public.ai_messages(conversation_id, created_at);
