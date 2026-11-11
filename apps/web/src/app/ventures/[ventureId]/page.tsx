"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";

type Project = { id: string; name: string; description: string | null };
type Task = {
  id: string;
  title: string;
  status: string;
};

export default function VentureDetailPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, [supabase.auth]);

  async function loadProjects() {
    if (!token) return;
    const r = await apiFetch(`/api/v1/ventures/${ventureId}/projects`, token);
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setProjects(await r.json());
  }

  useEffect(() => {
    void loadProjects();
  }, [token, ventureId]);

  async function addProject(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const r = await apiFetch(`/api/v1/ventures/${ventureId}/projects`, token, {
      method: "POST",
      body: JSON.stringify({ name: projectName, description: null }),
    });
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setProjectName("");
    await loadProjects();
  }

  async function loadTasks(pid: string) {
    if (!token) return;
    const r = await apiFetch(
      `/api/v1/ventures/${ventureId}/projects/${pid}/tasks`,
      token,
    );
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setTasks(await r.json());
  }

  useEffect(() => {
    if (selectedProject) void loadTasks(selectedProject);
  }, [selectedProject, token, ventureId]);

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedProject) return;
    const r = await apiFetch(
      `/api/v1/ventures/${ventureId}/projects/${selectedProject}/tasks`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ title: taskTitle, status: "backlog" }),
      },
    );
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setTaskTitle("");
    await loadTasks(selectedProject);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/ventures" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Ventures
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-100">Venture workspace</h1>
      <p className="text-xs text-zinc-600">{ventureId}</p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-zinc-200">Projects</h2>
        <form onSubmit={addProject} className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
            Add
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedProject(p.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedProject === p.id
                    ? "border-blue-500 bg-blue-950/30 text-blue-100"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-200"
                }`}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selectedProject && (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-200">Tasks</h2>
          <form onSubmit={addTask} className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title"
            />
            <button type="submit" className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white">
              Add task
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300"
              >
                <span>{t.title}</span>
                <span className="text-zinc-500">{t.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
    </main>
  );
}
