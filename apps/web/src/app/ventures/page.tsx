"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";

type Venture = {
  id: string;
  name: string;
  description: string | null;
};

export default function VenturesPage() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [list, setList] = useState<Venture[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, [supabase.auth]);

  async function load() {
    if (!token) return;
    const r = await apiFetch("/api/v1/ventures", token);
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setList(await r.json());
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const r = await apiFetch("/api/v1/ventures", token, {
      method: "POST",
      body: JSON.stringify({ name, description: null }),
    });
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setName("");
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-100">Ventures</h1>
      <form onSubmit={create} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          placeholder="New venture name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!token}
        >
          Add
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <ul className="mt-8 space-y-3">
        {list.map((v) => (
          <li key={v.id}>
            <Link
              href={`/ventures/${v.id}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 hover:border-zinc-600"
            >
              <span className="font-medium text-zinc-100">{v.name}</span>
              {v.description && (
                <span className="mt-1 block text-sm text-zinc-500">{v.description}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
