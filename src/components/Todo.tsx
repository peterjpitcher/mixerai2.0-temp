'use client';

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"
import { Input } from "@/components/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/card"
import { Separator } from "@/components/separator"
import { Calendar, Clock, Flag, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover"
import { Calendar as CalendarComponent } from "@/components/calendar"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select"

interface TodoItem {
  id: string
  text: string
  completed: boolean
  dueDate?: Date
  priority: 'low' | 'medium' | 'high'
}

interface TodoProps {
  title?: string
  className?: string
}

// Priority styling configurations
const priorityConfig = {
  low: { color: "text-blue-500", bgColor: "bg-blue-100" },
  medium: { color: "text-amber-500", bgColor: "bg-amber-100" },
  high: { color: "text-red-500", bgColor: "bg-red-100" },
}

export function Todo({ title = "Todo List", className }: TodoProps) {
  const [todos, setTodos] = React.useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = React.useState("")
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [selectedPriority, setSelectedPriority] = React.useState<'low' | 'medium' | 'high'>('medium')

  // Load todos from localStorage on initial render
  React.useEffect(() => {
    const savedTodos = localStorage.getItem('mixerAiTodos')
    if (savedTodos) {
      try {
        const parsedTodos = JSON.parse(savedTodos)
        // Convert string dates back to Date objects
        const todosWithDates = parsedTodos.map((todo: any) => ({
          ...todo,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined
        }))
        setTodos(todosWithDates)
      } catch (error) {
        console.error('Failed to parse todos from localStorage', error)
      }
    }
  }, [])

  // Save todos to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('mixerAiTodos', JSON.stringify(todos))
  }, [todos])

  const addTodo = () => {
    if (newTodo.trim() === "") return
    
    setTodos([
      ...todos,
      {
        id: crypto.randomUUID(),
        text: newTodo.trim(),
        completed: false,
        dueDate: selectedDate,
        priority: selectedPriority
      }
    ])
    setNewTodo("")
    setSelectedDate(undefined)
    setSelectedPriority('medium')
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

  const updateTodoDueDate = (id: string, date: Date | undefined) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, dueDate: date } : todo
      )
    )
  }

  const updateTodoPriority = (id: string, priority: 'low' | 'medium' | 'high') => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, priority } : todo
      )
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  // Sort todos: first by completion status, then by priority, then by due date
  const sortedTodos = [...todos].sort((a, b) => {
    // Completed items go to the bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    
    // Sort by priority (high to low)
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (a.priority !== b.priority) 
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    
    // Sort by due date (earliest first)
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    
    return 0
  })

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 mb-2"
          />
          
          <div className="flex gap-2 my-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Set due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Select 
              value={selectedPriority} 
              onValueChange={(value) => setSelectedPriority(value as 'low' | 'medium' | 'high')}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={addTodo}>Add</Button>
          </div>
        </div>
        
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet. Add one above!
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedTodos.map(todo => (
              <li 
                key={todo.id} 
                className={cn(
                  "flex flex-col gap-1 p-2 rounded-md transition-all",
                  todo.completed ? "opacity-60" : priorityConfig[todo.priority].bgColor
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`todo-${todo.id}`}
                      className={cn(
                        "block text-sm cursor-pointer",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.text}
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {todo.dueDate && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 text-xs"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              {format(todo.dueDate, 'dd MMM')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={todo.dueDate}
                              onSelect={(date) => updateTodoDueDate(todo.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      <Select 
                        value={todo.priority} 
                        onValueChange={(value) => updateTodoPriority(todo.id, value as 'low' | 'medium' | 'high')}
                      >
                        <SelectTrigger className="h-6 px-2 text-xs">
                          <Flag className="mr-1 h-3 w-3" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTodo(todo.id)}
                    className="h-7 w-7 ml-auto"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="py-3 flex justify-between">
        <p className="text-xs text-muted-foreground">
          {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
        </p>
        {todos.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTodos(todos.filter(todo => !todo.completed))}
            className="h-6 text-xs"
          >
            Clear completed
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 