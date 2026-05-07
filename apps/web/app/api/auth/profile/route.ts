import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const { createClient } = await import("@/lib/supabase/server");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name) {
    updates.data = { ...(updates.data as object || {}), name: body.name };
  }

  if (body.newPassword) {
    const { error: pwdErr } = await supabase.auth.updateUser({ password: body.newPassword });
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr.message }, { status: 400 });
    }
  }

  if (body.name) {
    const { error: updateErr } = await supabase.auth.updateUser({ data: { name: body.name } });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
