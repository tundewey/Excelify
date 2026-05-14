"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface Lesson {
  id: number;
  title: string;
  content: string;
}

interface CourseDetail {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/courses/${courseId}`));
      if (!res.ok) {
        setError(`Course not found or server error (HTTP ${res.status}).`);
        setCourse(null);
        return;
      }
      const data = (await res.json()) as CourseDetail;
      setCourse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    const title = lessonTitle.trim();
    const content = lessonContent.trim();
    if (!title || !content) {
      setCreateError("Lesson title and content are required.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/courses/${courseId}/lessons`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(
          typeof data.detail === "string"
            ? data.detail
            : `Could not create lesson (HTTP ${res.status})`
        );
        return;
      }
      setLessonTitle("");
      setLessonContent("");
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setCreating(false);
    }
  }

  const lessons = course?.lessons ?? [];

  return (
    <div className="space-y-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="text-violet-400 hover:text-violet-300">
          Courses
        </Link>
        <span className="mx-2 text-zinc-600">/</span>
        <span className="text-zinc-300">Course {courseId}</span>
      </nav>

      {loading && (
        <p className="text-zinc-500">Loading course…</p>
      )}

      {error && !loading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {course && !loading && (
        <>
          <header className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-400">{course.description}</p>
          </header>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-semibold text-white">Add lesson</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Lesson id is auto-assigned. Lessons open the AI tutor and topic studio.
            </p>
            <form onSubmit={addLesson} className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Lesson content (markdown or plain text)"
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {creating ? "Adding…" : "Add lesson"}
              </button>
            </form>
            {createError && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {createError}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Lessons</h2>
            {lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-12 text-center text-zinc-500">
                No lessons yet. Add one above.
              </div>
            ) : (
              <ul className="space-y-3">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/lessons/${lesson.id}`}
                      className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-violet-500/40 hover:bg-zinc-900"
                    >
                      <div>
                        <h3 className="font-semibold text-white">{lesson.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                          {lesson.content}
                        </p>
                      </div>
                      <span className="shrink-0 text-violet-400">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
