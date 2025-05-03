'use client';

import { Todo } from "@/components/Todo"
import Link from "next/link";
import { Button } from "@/components/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function TodoApp() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Only show UI after component has mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="container max-w-4xl py-10">
      <header className="flex justify-between items-center mb-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back to Dashboard
        </Link>
        
        {mounted && (
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
      </header>
      
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Enhanced Todo App</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          This advanced todo app demonstrates categories, tags, searching, filtering, and persistence. Your tasks and preferences are automatically saved between sessions.
        </p>
      </div>
      
      <Todo title="My Tasks" className="shadow-lg" />
      
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>Built with Next.js & React for MixerAI 2.0</p>
      </footer>
    </div>
  )
} 