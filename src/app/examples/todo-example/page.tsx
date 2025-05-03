'use client';

import { Todo } from "@/components/Todo"

export default function TodoExample() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Todo Example</h1>
      <div className="max-w-md mx-auto">
        <Todo title="My Tasks" />
      </div>
    </div>
  )
} 