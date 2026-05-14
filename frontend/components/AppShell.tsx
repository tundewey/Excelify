"use client";

import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-xl font-bold tracking-tight text-transparent"
          >
          ExcelifAI
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link
              href="/"
              className="transition-colors hover:text-violet-300"
            >
              Courses
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>
    </div>
  );
}
