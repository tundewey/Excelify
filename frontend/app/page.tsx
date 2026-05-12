"use client";

import { useState } from "react";

// const API_BASE = "http://127.0.0.1:8000";
const API_BASE = "http://localhost:8000";

function formatTime() {
  return new Date().toLocaleTimeString();
}

type AgentStep = {
  step: number;
  tool: string;
  reasoning: string;
  result: string;
};

type ChatMessage =
  | { id: string; role: "user"; content: string; timestamp: string }
  | {
      id: string;
      role: "assistant";
      finalResponse: string;
      history: AgentStep[];
      error?: string;
      timestamp: string;
    };

function newId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "student_1",
          question: trimmed,
        }),
      });

      let data: {
        history?: AgentStep[];
        final_response?: string;
        error?: string;
      };
      try {
        data = await res.json();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            finalResponse: "",
            history: [],
            error: `Invalid JSON from server (HTTP ${res.status}).`,
            timestamp: formatTime(),
          },
        ]);
        return;
      }

      const history = Array.isArray(data.history) ? data.history : [];

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            finalResponse: data.final_response ?? "",
            history,
            error: data.error ?? `Request failed (HTTP ${res.status}).`,
            timestamp: formatTime(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          finalResponse: data.final_response ?? "",
          history,
          timestamp: formatTime(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          finalResponse: "",
          history: [],
          error: e instanceof Error ? e.message : "Network error (fetch failed).",
          timestamp: formatTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile() {
    if (!file) return;

    setUploadMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/v1/upload`, {
        method: "POST",
        body: formData,
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setUploadMessage(`Upload failed: response was not JSON (HTTP ${res.status}).`);
        return;
      }

      if (!res.ok) {
        const detail = data.detail;
        const detailStr =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? JSON.stringify(detail)
              : JSON.stringify(data);
        setUploadMessage(`Upload failed (HTTP ${res.status}): ${detailStr}`);
        return;
      }

      const filename = String(data.filename ?? file.name);
      const numChunks = data.num_chunks ?? "?";
      const msg = String(data.message ?? "OK");
      setUploadMessage(`Uploaded successfully: ${filename} • ${numChunks} chunks • ${msg}`);
    } catch (e) {
      setUploadMessage(
        e instanceof Error ? e.message : "Network error during upload."
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-0 max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">AI LMS</h1>

      <div className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Send a message to start. Agent steps and the final answer appear below each reply.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div
              key={m.id}
              className="ml-8 rounded-lg bg-zinc-200 px-3 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  You
                </p>
                <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {m.timestamp}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
            </div>
          ) : (
            <div
              key={m.id}
              className="mr-8 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Assistant
                </p>
                <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {m.timestamp}
                </p>
              </div>
              {m.error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{m.error}</p>
              )}
              {m.history.length > 0 && (
                <ul className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {m.history.map((step) => (
                    <li key={`${m.id}-step-${step.step}`} className="text-sm">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        Step {step.step} ·{" "}
                        <span className="font-mono text-xs text-violet-700 dark:text-violet-400">
                          {step.tool}
                        </span>
                      </div>
                      {step.reasoning ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {step.reasoning}
                        </p>
                      ) : null}
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        {step.result ?? ""}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
              {m.finalResponse && !m.error && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Final
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                    {m.finalResponse}
                  </p>
                </div>
              )}
            </div>
          )
        )}
        {loading && (
          <p className="text-sm text-zinc-500">Assistant is typing…</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="mb-6">
          <input
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0]);
              }
            }}
          />

          <button
            type="button"
            onClick={() => void uploadFile()}
            className="ml-2 bg-blue-500 px-4 py-2 text-white"
          >
            Upload
          </button>

          <p className="mt-2">{uploadMessage}</p>
        </div>
        <textarea
          className="min-h-[6rem] w-full rounded border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          rows={4}
          value={message}
          placeholder="Ask a question…"
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
          disabled={loading}
          onClick={() => void sendMessage()}
          className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </main>
  );
}


// ==============================================================

// "use client";

// import { useState } from "react";

// type AgentStep = {
//   step: number;
//   tool: string;
//   reasoning: string;
//   result: string;
// };

// type ChatMessage =
//   | { id: string; role: "user"; content: string }
//   | {
//     id: string;
//     role: "assistant";
//     finalResponse: string;
//     history: AgentStep[];
//     error?: string;
//   };

// function newId() {
//   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
// }

// export default function Home() {
//   const [message, setMessage] = useState("");
//   // const [messages, setMessages] = useState<{role: string;content: string;}[]>([]);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [loading, setLoading] = useState(false);

//   const [file, setFile] = useState<File | null>(null);
//   const [uploadMessage, setUploadMessage] = useState("");

//   async function sendMessage() {
//     const trimmed = message.trim();
//     if (!trimmed || loading) return;

//     const userMsg: ChatMessage = {
//       id: newId(),
//       role: "user",
//       content: trimmed,
//     };
//     setMessages((prev) => [...prev, userMsg]);
//     setMessage("");
//     setLoading(true);

//     try {
//       const res = await fetch("http://localhost:8000/api/v1/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           session_id: "student_1",
//           question: trimmed,
//         }),
//       });

//       let data: {
//         history?: AgentStep[];
//         final_response?: string;
//         error?: string;
//       };
//       try {
//         data = await res.json();
//       } catch {
//         setMessages((prev) => [
//           ...prev,
//           {
//             id: newId(),
//             role: "assistant",
//             finalResponse: "",
//             history: [],
//             error: `Invalid JSON from server (HTTP ${res.status}).`,
//           },
//         ]);
//         return;
//       }

//       const history = Array.isArray(data.history) ? data.history : [];

//       if (!res.ok || data.error) {
//         setMessages((prev) => [
//           ...prev,
//           {
//             id: newId(),
//             role: "assistant",
//             finalResponse: data.final_response ?? "",
//             history,
//             error: data.error ?? `Request failed (HTTP ${res.status}).`,
//           },
//         ]);
//         return;
//       }

//       setMessages((prev) => [
//         ...prev,
//         {
//           id: newId(),
//           role: "assistant",
//           finalResponse: data.final_response ?? "",
//           history,
//         },
//       ]);
//     } catch (e) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: newId(),
//           role: "assistant",
//           finalResponse: "",
//           history: [],
//           error: e instanceof Error ? e.message : "Network error (fetch failed).",
//         },
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function uploadFile() {

//     if (!file) return;

//     const formData = new FormData();

//     formData.append("file", file);

//     const res = await fetch(
//       "http://127.0.0.1:8000/api/v1/upload",
//       {
//         method: "POST",
//         body: formData
//       }
//     );

//     const data = await res.json();

//     setUploadMessage(
//       `Uploaded successfully: ${data.filename} • ${data.num_chunks} chunks • ${data.message}`
//     );
//   }

//   return (
//     <main className="mx-auto flex min-h-0 max-w-3xl flex-col gap-6 p-6">
//       <h1 className="text-3xl font-bold">AI LMS</h1>

//       <div className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
//         {messages.length === 0 && (
//           <p className="text-sm text-zinc-500">
//             Send a message to start. Agent steps and the final answer appear below each reply.
//           </p>
//         )}
//         {messages.map((m) =>
//           m.role === "user" ? (
//             <div
//               key={m.id}
//               className="ml-8 rounded-lg bg-zinc-200 px-3 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
//             >
//               <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
//                 You
//               </p>
//               <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
//             </div>
//           ) : (
//             <div
//               key={m.id}
//               className="mr-8 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
//             >
//               <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
//                 Assistant
//               </p>
//               {m.error && (
//                 <p className="mt-2 text-sm text-red-600 dark:text-red-400">{m.error}</p>
//               )}
//               {m.history.length > 0 && (
//                 <ul className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
//                   {m.history.map((step) => (
//                     <li key={`${m.id}-step-${step.step}`} className="text-sm">
//                       <div className="font-medium text-zinc-800 dark:text-zinc-200">
//                         Step {step.step} ·{" "}
//                         <span className="font-mono text-xs text-violet-700 dark:text-violet-400">
//                           {step.tool}
//                         </span>
//                       </div>
//                       {step.reasoning ? (
//                         <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
//                           {step.reasoning}
//                         </p>
//                       ) : null}
//                       <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
//                         {step.result ?? ""}
//                       </pre>
//                     </li>
//                   ))}
//                 </ul>
//               )}
//               {m.finalResponse && !m.error && (
//                 <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
//                   <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
//                     Final
//                   </p>
//                   <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
//                     {m.finalResponse}
//                   </p>
//                 </div>
//               )}
//             </div>
//           )
//         )}
//         {loading && <p className="text-sm text-zinc-500">Thinking…</p>}
//       </div>

//       <div className="flex flex-col gap-2">

//         <div className="mb-6">

//           <input
//             type="file"
//             onChange={(e) => {
//               if (e.target.files?.[0]) {
//                 setFile(e.target.files[0]);
//               }
//             }}
//           />

//           <button
//             onClick={uploadFile}
//             className="bg-blue-500 text-white px-4 py-2 ml-2"
//           >
//             Upload
//           </button>

//           <p className="mt-2">
//             {uploadMessage}
//           </p>

//         </div>
//         <textarea
//           className="min-h-[6rem] w-full rounded border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
//           rows={4}
//           value={message}
//           placeholder="Ask a question…"
//           onChange={(e) => setMessage(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault();
//               void sendMessage();
//             }
//           }}
//         />
//         <button
//           type="button"
//           disabled={loading}
//           onClick={() => void sendMessage()}
//           className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
//         >
//           {loading ? "Sending…" : "Send"}
//         </button>
//       </div>
//     </main>
//   );
// }

// =======================================================================

// "use client";

// import { useState } from "react";

// export default function Home() {

//   const [message, setMessage] = useState("");
//   const [response, setResponse] = useState("");

//   async function sendMessage() {

//     const res = await fetch("http://localhost:8000/api/v1/chat", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({
//         session_id: "student_1",
//         question: message
//       })
//     });

//     const data = await res.json();

//     // setResponse(data.final_response);

//     if (data.error) {
//       setResponse(`Error: ${data.error}`);
//     } else {
//       setResponse(data.final_response ?? "(no final_response in response)");
//     }
//   }

//   return (
//     <main className="p-10">

//       <h1 className="text-3xl font-bold mb-6">
//         AI LMS
//       </h1>

//       <textarea
//         className="border p-2 w-full"
//         rows={5}
//         value={message}
//         onChange={(e) => setMessage(e.target.value)}
//       />

//       <button
//         onClick={sendMessage}
//         className="bg-black text-white px-4 py-2 mt-4"
//       >
//         Send
//       </button>

//       <div className="mt-8 border p-4">
//         {response}
//       </div>

//     </main>
//   );
// }

