"use client";

import { useUser } from "@/components/auth-provider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/signin");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.user_metadata?.name) setName(user.user_metadata.name as string);
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const updates: Record<string, unknown> = {};
    if (name) {
      updates.data = { name };
    }

    if (newPassword) {
      const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwdErr) {
        setError(pwdErr.message);
        setSaving(false);
        return;
      }
    }

    if (name) {
      const { error: updateErr } = await supabase.auth.updateUser({ data: { name } });
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    }

    setMessage("Profile updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setSaving(false);
  }

  if (authLoading) {
    return <div className="max-w-lg mx-auto px-4 py-12"><p className="text-slate-500">Loading...</p></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Profile</h1>
      <p className="text-sm text-slate-500 mb-8">Manage your account details.</p>

      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-sm font-medium text-slate-700">Email</p>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input id="name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <hr className="border-slate-200" />
        <p className="text-sm font-medium text-slate-700">Change password</p>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="At least 6 characters" />
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
