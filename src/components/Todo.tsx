'use client';

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"
import { Input } from "@/components/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/card"
import { Separator } from "@/components/separator"
import { Trash2 } from "lucide-react"

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface TodoProps {
  title?: string
  className?: string
}

export function Todo({ title = "Todo List", className }: TodoProps) {
  const [todos, setTodos] = React.useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = React.useState("")

  const addTodo = () => {
    if (newTodo.trim() === "") return
    
    setTodos([
      ...todos,
      {
        id: crypto.randomUUID(),
        text: newTodo.trim(),
        completed: false
      }
    ])
    setNewTodo("")
  }

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const removeTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button size="sm" onClick={addTodo}>Add</Button>
        </div>
        
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet. Add one above!
          </p>
        ) : (
          <ul className="space-y-2">
            {todos.map(todo => (
              <li key={todo.id} className="flex items-center gap-2">
                <Checkbox
                  id={`todo-${todo.id}`}
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                />
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={cn(
                    "flex-1 text-sm cursor-pointer",
                    todo.completed && "line-through text-muted-foreground"
                  )}
                >
                  {todo.text}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTodo(todo.id)}
                  className="h-7 w-7"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="py-3">
        <p className="text-xs text-muted-foreground">
          {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
        </p>
      </CardFooter>
    </Card>
  )
} 