import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import inboxIcon from "@/assets/icon-inbox.png";

const searchSchema = z.object({ mode: z.enum(["sign-in", "sign-up"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Smart Notes" },
      { name: "description", content: "Sign in to Smart Notes to access your AI-powered notes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode = "sign-in" } = useSearch({ from: "/auth" });
  const isSignUp = mode === "sign-up";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    // On success, Supabase redirects the browser to Google, then back to redirectTo.
  }

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <Window
        title="Smart Notes"
        className="w-full max-w-md"
        bodyClassName="px-7 pb-8 pt-2"
      >
        <div className="flex flex-col items-center text-center">
          <img src={inboxIcon} alt="" width={88} height={88} className="drop-shadow-xl" />
          <h1 className="font-display mt-4 text-xl">
            {isSignUp ? "Create your Smart Notes account" : "Sign in to Smart Notes"}
          </h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Beautiful, AI-powered notes — summaries, key points, chat, folders and tags.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full px-5 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-full px-5 text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full text-base font-semibold"
          >
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={loading}
          className="h-12 w-full rounded-full text-base"
        >
          <GoogleMark /> Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            to="/auth"
            search={{ mode: isSignUp ? "sign-in" : "sign-up" }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </Window>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1S8.7 6 12 6c1.88 0 3.14.8 3.86 1.5l2.64-2.55C16.86 3.42 14.66 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.2-3.9 9.2-9.36 0-.63-.07-1.1-.16-1.6H12z" />
    </svg>
  );
}
