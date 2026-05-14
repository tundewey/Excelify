"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface Course {
  id: number;
  title: string;
  description: string;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/courses"));
      if (!res.ok) {
        setError(`Could not load courses (HTTP ${res.status}).`);
        return;
      }
      const data = (await res.json()) as Course[];
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    const description = newDescription.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(apiUrl("/api/v1/courses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || "—",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(
          typeof data.detail === "string"
            ? data.detail
            : `Create failed (HTTP ${res.status})`
        );
        return;
      }
      setNewTitle("");
      setNewDescription("");
      await loadCourses();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl shadow-violet-950/20">
        <p className="text-sm font-medium uppercase tracking-widest text-violet-400/90">
          Learning platform
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Teach and learn with{" "}
          <span className="text-violet-300">text courses</span> + AI
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Create courses, add lessons, upload materials, generate topic outlines,
          and chat with an assistive tutor — all in one flow.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">New course</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Course id is assigned automatically. Add a title and optional description.
        </p>
        <form onSubmit={createCourse} className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="sr-only" htmlFor="course-title">
              Title
            </label>
            <input
              id="course-title"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Course title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Short description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-violet-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create course"}
          </button>
        </form>
        {createError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {createError}
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Your courses</h2>
          {loading && (
            <span className="text-sm text-zinc-500">Loading…</span>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-8 py-16 text-center">
            <p className="text-lg text-zinc-400">No courses yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Create your first course above, then open it to add lessons.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-violet-500/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-violet-950/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold text-white group-hover:text-violet-200">
                  {course.title}
                </h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
                  #{course.id}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                {course.description}
              </p>
              <p className="mt-4 text-sm font-medium text-violet-400/90">
                Open course →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
