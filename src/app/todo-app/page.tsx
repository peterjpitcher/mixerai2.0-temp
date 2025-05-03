'use client';

import { Todo } from "@/components/Todo"
import Link from "next/link";

export default function TodoApp() {
  return (
    <div className="container py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-4 text-center">Enhanced Todo App</h1>
      <p className="text-center mb-8 text-muted-foreground max-w-2xl mx-auto">
        This todo app demonstrates local storage persistence, due dates, priority levels, sorting, and filtering. Your tasks will be saved between sessions.
      </p>
      <div className="max-w-md mx-auto">
        <Todo title="My Tasks" />
      </div>
    </div>
  )
} 