"use client";

import Link from "next/link";
// import { useEffect, useState } from "react";
import { use, useEffect, useState } from "react";

interface Lesson {
  id: number;
  title: string;
  content: string;
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {

  const { courseId } = use(params);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {

    async function fetchLessons() {

      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/courses/${courseId}`
      );

      const data = await res.json();

      setLessons(data.lessons || []);
    }

    fetchLessons();

  }, [courseId]);

  return (

    <main className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Course Lessons
      </h1>

      <div className="space-y-4">

        {lessons.map((lesson) => (

          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}`}
            className="block border p-4 rounded"
          >

            <h2 className="text-xl font-bold">
              {lesson.title}
            </h2>

            <p>{lesson.content}</p>

          </Link>

        ))}

      </div>

    </main>
  );
}