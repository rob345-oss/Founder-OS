"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSummary, type DashboardSummary } from "@/lib/api";
import { CrmHomeLink } from "@/components/crm/CrmHomeLink";
import { MarketingHomeLink } from "@/components/marketing/MarketingHomeLink";

export default function HomePage() {
  const supabase = createClient();
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"]>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (!session?.access_token) {
      setSummary(null);
      return;
    }
    void getSummary(session.access_token)
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, [session?.access_token]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-widest text-zinc-500">Founder OS</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Command Center</h1>
        <p className="mt-2 text-zinc-400">
          Ventures, projects, and tasks — authenticated via Supabase; data from the Founder OS
          API.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/studio"
            className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          >
            Open Founder OS Studio
          </a>
          <CrmHomeLink />
          <MarketingHomeLink />
        </div>
      </header>

      {!session && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-zinc-300">Sign in with your Supabase account to load the dashboard.</p>
          <AuthForm />
        </section>
      )}

      {session && (
        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Ventures" value={summary?.venture_count ?? "—"} />
          <StatCard label="Projects" value={summary?.project_count ?? "—"} />
          <StatCard label="Open tasks" value={summary?.task_open_count ?? "—"} />
          <StatCard label="Done tasks" value={summary?.task_done_count ?? "—"} />
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      {session && (
        <button
          type="button"
          className="mt-10 text-sm text-zinc-500 underline hover:text-zinc-300"
          onClick={() => void supabase.auth.signOut()}
        >
          Sign out
        </button>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function AuthForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  return (
    <form onSubmit={signIn} className="mt-4 flex max-w-sm flex-col gap-3">
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Sign in
      </button>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </form>
  );
}
