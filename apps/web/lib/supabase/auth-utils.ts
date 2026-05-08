import type { User } from "@supabase/supabase-js";

export async function getAuthUser(): Promise<User | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
