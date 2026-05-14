"use client";

import { use, useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

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
  
  const [file, setFile] = useState<File | null>(null);
//   const [uploadMessage, setUploadMessage] = useState("");
  const [lastIngestion, setLastIngestion] = useState<LastIngestion | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        const res = await fetch(`${API_BASE}/api/v1/courses`);
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

        if (!cancelled) setLessonError("Lesson not found (no course contains this lesson id).");
      } catch (e) {
        if (!cancelled) {
          setLessonError(e instanceof Error ? e.message : "Network error while loading lesson.");
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
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "student_1",
          lesson_id: Number(lessonId),
          question: trimmed,
        }),
      });

      const data = (await res.json()) as { final_response?: string; error?: string };

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
    }
  }

  async function uploadLessonMaterial() {
    if (!file) return;

    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/v1/upload/${encodeURIComponent(lessonId)}`,
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

//   async function uploadLessonMaterial() {
//     if (!file) return;

//     setUploadMessage("");
//     try {
//       const formData = new FormData();
//       formData.append("file", file);

//       const res = await fetch(
//         `${API_BASE}/api/v1/upload/${encodeURIComponent(lessonId)}`,
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       let data: { chunks?: number; message?: string; lesson_id?: number } = {};
//       try {
//         data = await res.json();
//       } catch {
//         setUploadMessage(`Upload failed: invalid JSON (HTTP ${res.status}).`);
//         return;
//       }

//       if (!res.ok) {
//         setUploadMessage(
//           `Upload failed (HTTP ${res.status}): ${JSON.stringify(data)}`
//         );
//         return;
//       }

//       setUploadMessage(
//         `Processed ${data.chunks ?? "?"} chunks — ${data.message ?? "OK"}`
//       );
//     } catch (e) {
//       setUploadMessage(
//         e instanceof Error ? e.message : "Network error during upload."
//       );
//     }
//   }

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">AI Lesson Tutor</h1>

      {lessonLoading && (
        <p className="mb-4 text-sm text-zinc-500">Loading lesson…</p>
      )}

      {lessonError && !lessonLoading && (
        <p className="mb-4 text-sm text-red-600">{lessonError}</p>
      )}

      {lesson && !lessonLoading && (
        <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-2xl font-semibold">{lesson.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {lesson.content}
          </p>
        </section>
      )}

    <div className="mb-6 rounded border p-4">
        <h2 className="mb-4 text-xl font-bold">Upload Lesson Material</h2>

        <input
          type="file"
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
          className="ml-2 bg-blue-500 px-4 py-2 text-white"
        >
          Upload
        </button>

        {/* <p className="mt-2">{uploadMessage}</p> */}

        {uploadError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {uploadError}
          </p>
        )}

        {lastIngestion && (
          <div
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Ingestion complete
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="font-medium text-emerald-900/80 dark:text-emerald-200/90">
                File
              </dt>
              <dd className="break-all font-mono text-xs sm:text-sm">
                {lastIngestion.filename}
              </dd>
              <dt className="font-medium text-emerald-900/80 dark:text-emerald-200/90">
                Chunks indexed
              </dt>
              <dd>
                <span className="text-lg font-semibold tabular-nums">
                  {lastIngestion.chunkCount}
                </span>
                <span className="ml-1 text-emerald-800/80 dark:text-emerald-300/80">
                  text segments for retrieval
                </span>
              </dd>
              <dt className="font-medium text-emerald-900/80 dark:text-emerald-200/90">
                Lesson scope
              </dt>
              <dd>
                <span className="rounded bg-emerald-200/80 px-2 py-0.5 font-mono text-sm font-semibold text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50">
                  lesson_id = {lastIngestion.lessonId}
                </span>
                <span className="ml-2 text-xs text-emerald-800/90 dark:text-emerald-300/90">
                  RAG uses vectors only for this lesson.
                </span>
              </dd>
            </dl>
          </div>
        )}
        
      </div>

      <div className="mb-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className="rounded border p-4">
            <strong>{msg.role}</strong>
            <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      <textarea
        className="w-full rounded border p-2"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        type="button"
        onClick={() => void sendMessage()}
        className="mt-4 bg-black px-4 py-2 text-white"
      >
        Ask AI Tutor
      </button>
    </main>
  );
}

// async function uploadLessonMaterial() {

//     if (!file) return;
  
//     const formData = new FormData();
  
//     formData.append("file", file);
  
//     const res = await fetch(
//       `http://127.0.0.1:8000/api/v1/upload/${params.lessonId}`,
//       {
//         method: "POST",
//         body: formData
//       }
//     );
  
//     const data = await res.json();
  
//     setUploadMessage(
//       `Processed ${data.chunks} chunks`
//     );
//   }

// "use client";

// // import { useState } from "react";
// import { use, useState } from "react";

// export default function LessonPage({
//     params,
//   }: {
//     params: Promise<{ lessonId: string }>;
//   }) {

//   const { lessonId } = use(params);
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState<any[]>([]);

//   async function sendMessage() {

//     const userMessage = {
//       role: "user",
//       content: message
//     };

//     setMessages((prev) => [
//       ...prev,
//       userMessage
//     ]);

//     const res = await fetch(
//       "http://127.0.0.1:8000/api/v1/chat",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           session_id: "student_1",
//           lesson_id: Number(lessonId),
//           question: message
//         })
//       }
//     );

//     const data = await res.json();

//     setMessages((prev) => [
//       ...prev,
//       {
//         role: "assistant",
//         content: data.final_response
//       }
//     ]);

//     setMessage("");
//   }

//   return (

//     <main className="p-10">

//       <h1 className="text-3xl font-bold mb-6">
//         AI Lesson Tutor
//       </h1>

//       <div className="space-y-4 mb-6">

//         {messages.map((msg, index) => (

//           <div
//             key={index}
//             className="border p-4 rounded"
//           >

//             <strong>{msg.role}</strong>

//             <p>{msg.content}</p>

//           </div>

//         ))}

//       </div>

//       <textarea
//         className="border p-2 w-full"
//         rows={4}
//         value={message}
//         onChange={(e) =>
//           setMessage(e.target.value)
//         }
//       />

//       <button
//         onClick={sendMessage}
//         className="bg-black text-white px-4 py-2 mt-4"
//       >
//         Ask AI Tutor
//       </button>

//     </main>
//   );
// }