import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const { createClient } = await import("@/lib/supabase/server");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const errors: string[] = [];

  if (body.newPassword) {
    const { error: pwdErr } = await supabase.auth.updateUser({ password: body.newPassword });
    if (pwdErr) {
      errors.push(pwdErr.message);
    }
  }

  if (body.name) {
    const { error: updateErr } = await supabase.auth.updateUser({ data: { name: body.name } });
    if (updateErr) {
      errors.push(updateErr.message);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; "), success: false }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
