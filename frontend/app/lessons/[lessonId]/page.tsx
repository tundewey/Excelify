"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

type LessonDetail = {
  id: number;
  title: string;
  content: string;
};

type CourseFromApi = {
  id: number;
  title: string;
  description: string;
  lessons?: LessonDetail[];
};

type ChatRow = { role: "user" | "assistant"; content: string };

type LastIngestion = {
  filename: string;
  chunkCount: number;
  lessonId: number;
};

type TopicResult = {
  topic_title: string;
  summary: string;
  key_points: string[];
  suggested_activities: string[];
  raw_error?: string | null;
};

export default function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [chatSending, setChatSending] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [lastIngestion, setLastIngestion] = useState<LastIngestion | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [topicPrompt, setTopicPrompt] = useState(
    "Generate a concise teaching topic with key points for this lesson."
  );
  const [topicResult, setTopicResult] = useState<TopicResult | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLesson() {
      setLessonLoading(true);
      setLessonError(null);
      setLesson(null);

      const id = Number(lessonId);
      if (Number.isNaN(id)) {
        setLessonError("Invalid lesson id in URL.");
        setLessonLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/v1/courses"));
        if (!res.ok) {
          if (!cancelled) {
            setLessonError(`Could not load courses (HTTP ${res.status}).`);
          }
          return;
        }

        const courses = (await res.json()) as CourseFromApi[];

        for (const c of courses) {
          const hit = c.lessons?.find((l) => l.id === id);
          if (hit) {
            if (!cancelled) setLesson(hit);
            return;
          }
        }

        if (!cancelled) {
          setLessonError("Lesson not found (no course contains this lesson id).");
        }
      } catch (e) {
        if (!cancelled) {
          setLessonError(
            e instanceof Error ? e.message : "Network error while loading lesson."
          );
        }
      } finally {
        if (!cancelled) setLessonLoading(false);
      }
    }

    void loadLesson();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || chatSending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessage("");
    setChatSending(true);

    try {
      const res = await fetch(apiUrl("/api/v1/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "student_1",
          lesson_id: Number(lessonId),
          question: trimmed,
        }),
      });

      const data = (await res.json()) as {
        final_response?: string;
        error?: string;
      };

      const text =
        data.final_response ??
        data.error ??
        (res.ok ? "(empty response)" : `Request failed (HTTP ${res.status})`);

      setMessages((prev) => [...prev, { role: "assistant", content: String(text) }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Network error (fetch failed).",
        },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  async function uploadLessonMaterial() {
    if (!file) return;

    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        apiUrl(`/api/v1/upload/${encodeURIComponent(lessonId)}`),
        {
          method: "POST",
          body: formData,
        }
      );

      let data: { chunks?: number; message?: string; lesson_id?: number } = {};
      try {
        data = await res.json();
      } catch {
        setUploadError(`Upload failed: invalid JSON (HTTP ${res.status}).`);
        return;
      }

      if (!res.ok) {
        setUploadError(
          `Upload failed (HTTP ${res.status}): ${JSON.stringify(data)}`
        );
        return;
      }

      const chunks = typeof data.chunks === "number" ? data.chunks : 0;
      const scopedLessonId =
        typeof data.lesson_id === "number"
          ? data.lesson_id
          : Number(lessonId);

      setLastIngestion({
        filename: file.name,
        chunkCount: chunks,
        lessonId: scopedLessonId,
      });
    } catch (e) {
      setUploadError(
        e instanceof Error ? e.message : "Network error during upload."
      );
    }
  }

  async function generateTopic() {
    const prompt = topicPrompt.trim();
    if (!prompt || topicLoading) return;

    setTopicError(null);
    setTopicResult(null);
    setTopicLoading(true);

    try {
      const res = await fetch(
        apiUrl(`/api/v1/lessons/${encodeURIComponent(lessonId)}/generate-topic`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      );

      const data = (await res.json()) as TopicResult & { detail?: string };

      if (!res.ok) {
        setTopicError(
          typeof data.detail === "string"
            ? data.detail
            : `Topic generation failed (HTTP ${res.status})`
        );
        return;
      }

      setTopicResult(data);
    } catch (e) {
      setTopicError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setTopicLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="text-violet-400 hover:text-violet-300">
          Courses
        </Link>
        <span className="mx-2 text-zinc-600">/</span>
        <span className="text-zinc-300">Lesson {lessonId}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          AI Lesson Tutor
        </h1>
        <p className="mt-2 text-zinc-400">
          Materials, topic studio, and assistive chat — scoped to this lesson.
        </p>
      </header>

      {lessonLoading && (
        <p className="text-sm text-zinc-500">Loading lesson…</p>
      )}

      {lessonError && !lessonLoading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {lessonError}
        </p>
      )}

      {lesson && !lessonLoading && (
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-8 shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/90">
            Lesson
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{lesson.title}</h2>
          <article className="mt-4 whitespace-pre-wrap text-zinc-300 leading-relaxed">
            {lesson.content}
          </article>
        </section>
      )}

      <section className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-6">
        <h2 className="text-lg font-semibold text-white">Topic studio</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Describe what you want (e.g. &quot;Week 2: closures and scope&quot;). Uses
          lesson text and uploaded chunks when available.
        </p>
        <textarea
          className="mt-4 min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          value={topicPrompt}
          onChange={(e) => setTopicPrompt(e.target.value)}
        />
        <button
          type="button"
          disabled={topicLoading}
          onClick={() => void generateTopic()}
          className="mt-3 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {topicLoading ? "Generating…" : "Generate topic"}
        </button>
        {topicError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {topicError}
          </p>
        )}
        {topicResult && (
          <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900/80 p-6">
            {topicResult.raw_error ? (
              <p className="text-sm text-amber-300">
                Model output issue: {topicResult.raw_error}
              </p>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-violet-200">
                  {topicResult.topic_title}
                </h3>
                <p className="mt-3 text-zinc-300">{topicResult.summary}</p>
                {topicResult.key_points.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Key points
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-300">
                      {topicResult.key_points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {topicResult.suggested_activities.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Suggested activities
                    </p>
                    <ul className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-300">
                      {topicResult.suggested_activities.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Upload lesson material</h2>
        <p className="mt-1 text-sm text-zinc-500">
          UTF-8 text files work best. Embeddings are scoped to lesson{" "}
          <span className="font-mono text-zinc-400">{lessonId}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-200"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0]);
                setUploadError(null);
              }
            }}
          />
          <button
            type="button"
            onClick={() => void uploadLessonMaterial()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Upload
          </button>
        </div>
        {uploadError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {uploadError}
          </p>
        )}
        {lastIngestion && (
          <div
            className="mt-4 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-4 text-emerald-100"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Ingestion complete
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[9rem_1fr]">
              <dt className="font-medium text-emerald-300/90">File</dt>
              <dd className="break-all font-mono text-xs sm:text-sm">
                {lastIngestion.filename}
              </dd>
              <dt className="font-medium text-emerald-300/90">Chunks indexed</dt>
              <dd>
                <span className="text-lg font-semibold tabular-nums">
                  {lastIngestion.chunkCount}
                </span>
                <span className="ml-2 text-emerald-200/70">segments for retrieval</span>
              </dd>
              <dt className="font-medium text-emerald-300/90">Lesson scope</dt>
              <dd>
                <span className="rounded-md bg-emerald-900/80 px-2 py-0.5 font-mono text-sm">
                  lesson_id = {lastIngestion.lessonId}
                </span>
              </dd>
            </dl>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Assistive chat</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ask about the lesson or uploaded materials. Responses use your lesson id for
          retrieval.
        </p>
        <div className="mt-4 max-h-[min(420px,50vh)] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-600">No messages yet. Ask a question below.</p>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "ml-8 rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-3"
                  : "mr-8 rounded-2xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3"
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {msg.role}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {msg.content}
              </p>
            </div>
          ))}
          {chatSending && (
            <p className="text-sm text-zinc-500">Assistant is typing…</p>
          )}
        </div>
        <textarea
          className="mt-4 min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          rows={4}
          placeholder="Ask the tutor…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          type="button"
          disabled={chatSending}
          onClick={() => void sendMessage()}
          className="mt-3 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {chatSending ? "Sending…" : "Ask AI tutor"}
        </button>
      </section>
    </div>
  );
}
