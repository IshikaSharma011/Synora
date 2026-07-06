import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function SignOutButton() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full">
          <LogOut className="mr-1.5 h-4 w-4" /> Sign out
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">Sign out of Smart Notes?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You can sign back in any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={signOut}
            disabled={loading}
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
