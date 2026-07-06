import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dock } from "@/components/desktop/Dock";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="relative z-10 min-h-screen pb-32 pt-10">
      <div className="mx-auto w-full max-w-6xl px-4">
        <Outlet />
      </div>
      <Dock />
    </div>
  );
}
