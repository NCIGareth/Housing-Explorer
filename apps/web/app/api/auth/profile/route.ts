import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  newPassword: z.string().min(6).max(128).optional(),
});

export async function PATCH(req: Request) {
  try {
    const { createClient } = await import("@/lib/supabase/server");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = checkRateLimit(`profile:${user.email}`, 5);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = profileSchema.parse(await req.json());
    const errors: string[] = [];

    if (body.newPassword) {
      const { error: pwdErr } = await supabase.auth.updateUser({ password: body.newPassword });
      if (pwdErr) errors.push("Failed to update password");
    }

    if (body.name) {
      const { error: updateErr } = await supabase.auth.updateUser({ data: { name: body.name } });
      if (updateErr) errors.push("Failed to update profile");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; "), success: false }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
