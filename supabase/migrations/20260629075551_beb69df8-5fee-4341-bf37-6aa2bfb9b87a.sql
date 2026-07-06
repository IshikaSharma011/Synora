
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- instagram_accounts
CREATE TABLE public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, instagram_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts TO authenticated;
GRANT ALL ON public.instagram_accounts TO service_role;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig_accounts_own" ON public.instagram_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.instagram_accounts(user_id);
CREATE INDEX ON public.instagram_accounts(instagram_user_id);
CREATE TRIGGER trg_ig_accounts_updated BEFORE UPDATE ON public.instagram_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- keyword_rules
CREATE TABLE public.keyword_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('dm','comment')),
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','exact')),
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_rules TO authenticated;
GRANT ALL ON public.keyword_rules TO service_role;
ALTER TABLE public.keyword_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_own" ON public.keyword_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.keyword_rules(user_id);
CREATE INDEX ON public.keyword_rules(account_id);
CREATE INDEX ON public.keyword_rules(is_active);
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.keyword_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- dm_events
CREATE TABLE public.dm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.keyword_rules(id) ON DELETE SET NULL,
  sender_id TEXT,
  trigger_source TEXT,
  trigger_text TEXT,
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dm_events TO authenticated;
GRANT ALL ON public.dm_events TO service_role;
ALTER TABLE public.dm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_own_via_account" ON public.dm_events FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.instagram_accounts WHERE user_id = auth.uid()));
CREATE INDEX ON public.dm_events(account_id);
CREATE INDEX ON public.dm_events(sender_id);
CREATE INDEX ON public.dm_events(created_at DESC);

-- dm_logs
CREATE TABLE public.dm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.keyword_rules(id) ON DELETE SET NULL,
  recipient_id TEXT,
  message_type TEXT,
  message_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  instagram_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
GRANT SELECT ON public.dm_logs TO authenticated;
GRANT ALL ON public.dm_logs TO service_role;
ALTER TABLE public.dm_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_own" ON public.dm_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.dm_logs(user_id);
CREATE INDEX ON public.dm_logs(account_id);
CREATE INDEX ON public.dm_logs(rule_id);
CREATE INDEX ON public.dm_logs(status);
CREATE INDEX ON public.dm_logs(created_at DESC);
