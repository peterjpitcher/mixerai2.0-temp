'use client';

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/button"
import { Checkbox } from "@/components/checkbox"
import { Input } from "@/components/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/card"
import { Separator } from "@/components/separator"
import { Badge } from "@/components/badge"
import { Calendar, Clock, Flag, Plus, Search, Tag, Trash2, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover"
import { Calendar as CalendarComponent } from "@/components/calendar"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/tabs"
import { Switch } from "@/components/switch"
import { Label } from "@/components/label"

interface TodoItem {
  id: string
  text: string
  completed: boolean
  dueDate?: Date
  priority: 'low' | 'medium' | 'high'
  category: string
  tags: string[]
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
  const [selectedCategory, setSelectedCategory] = React.useState("Personal")
  const [newCategory, setNewCategory] = React.useState("")
  const [categories, setCategories] = React.useState<string[]>(["Personal", "Work", "Shopping"])
  const [activeCategory, setActiveCategory] = React.useState<string | 'all'>('all')
  const [showCompleted, setShowCompleted] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [tagInput, setTagInput] = React.useState("")
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [allTags, setAllTags] = React.useState<string[]>([])
  const [filterTags, setFilterTags] = React.useState<string[]>([])
  const [showAddCategory, setShowAddCategory] = React.useState(false)
  
  // Load todos from localStorage on initial render
  React.useEffect(() => {
    const savedTodos = localStorage.getItem('mixerAiTodos')
    const savedCategories = localStorage.getItem('mixerAiCategories')
    const savedTags = localStorage.getItem('mixerAiTags')
    
    if (savedTodos) {
      try {
        const parsedTodos = JSON.parse(savedTodos)
        // Convert string dates back to Date objects
        const todosWithDates = parsedTodos.map((todo: any) => ({
          ...todo,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          category: todo.category || "Personal", // Ensure category exists for legacy data
          tags: todo.tags || [] // Ensure tags exist for legacy data
        }))
        setTodos(todosWithDates)
      } catch (error) {
        console.error('Failed to parse todos from localStorage', error)
      }
    }
    
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories)
        setCategories(parsedCategories)
      } catch (error) {
        console.error('Failed to parse categories from localStorage', error)
      }
    }
    
    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags)
        setAllTags(parsedTags)
      } catch (error) {
        console.error('Failed to parse tags from localStorage', error)
      }
    }
  }, [])

  // Save todos to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('mixerAiTodos', JSON.stringify(todos))
  }, [todos])
  
  // Save categories to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('mixerAiCategories', JSON.stringify(categories))
  }, [categories])
  
  // Save tags to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('mixerAiTags', JSON.stringify(allTags))
  }, [allTags])
  
  // Update tags list
  React.useEffect(() => {
    const newTags = new Set<string>()
    todos.forEach(todo => {
      todo.tags.forEach(tag => newTags.add(tag))
    })
    setAllTags(Array.from(newTags))
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
        priority: selectedPriority,
        category: selectedCategory,
        tags: selectedTags
      }
    ])
    setNewTodo("")
    setSelectedDate(undefined)
    setSelectedPriority('medium')
    setSelectedTags([])
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
  
  const updateTodoCategory = (id: string, category: string) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, category } : todo
      )
    )
  }
  
  const addTagToTodo = (id: string, tag: string) => {
    if (!tag.trim()) return
    
    setTodos(
      todos.map(todo => {
        if (todo.id === id && !todo.tags.includes(tag)) {
          return { ...todo, tags: [...todo.tags, tag] }
        }
        return todo
      })
    )
  }
  
  const removeTagFromTodo = (id: string, tag: string) => {
    setTodos(
      todos.map(todo => {
        if (todo.id === id) {
          return { ...todo, tags: todo.tags.filter(t => t !== tag) }
        }
        return todo
      })
    )
  }
  
  const addCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return
    
    setCategories([...categories, newCategory.trim()])
    setSelectedCategory(newCategory.trim())
    setNewCategory("")
    setShowAddCategory(false)
  }
  
  const addTag = () => {
    if (!tagInput.trim() || selectedTags.includes(tagInput.trim())) return
    
    setSelectedTags([...selectedTags, tagInput.trim()])
    setTagInput("")
  }
  
  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }
  
  const toggleFilterTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter(t => t !== tag))
    } else {
      setFilterTags([...filterTags, tag])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }
  
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTag()
    }
  }
  
  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addCategory()
    }
  }
  
  // Filter todos based on active filters
  const filteredTodos = todos.filter(todo => {
    // Filter by category
    if (activeCategory !== 'all' && todo.category !== activeCategory) return false
    
    // Filter by completion status
    if (!showCompleted && todo.completed) return false
    
    // Filter by tags
    if (filterTags.length > 0 && !filterTags.some(tag => todo.tags.includes(tag))) return false
    
    // Filter by search query
    if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) return false
    
    return true
  })

  // Sort todos: first by completion status, then by priority, then by due date
  const sortedTodos = [...filteredTodos].sort((a, b) => {
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
    <Card className={cn("w-full mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <div className="flex items-center text-sm font-normal">
            <label htmlFor="show-completed" className="mr-2">Show completed</label>
            <Switch 
              id="show-completed" 
              checked={showCompleted} 
              onCheckedChange={setShowCompleted} 
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={addTodo}>Add</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Category selector */}
            <div className="flex-1 min-w-[120px]">
              {showAddCategory ? (
                <div className="flex gap-1">
                  <Input
                    placeholder="New category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={handleCategoryKeyDown}
                    className="flex-1 h-9"
                  />
                  <Button variant="ghost" size="icon" onClick={addCategory} className="h-9 w-9">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddCategory(false)} className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select 
                  value={selectedCategory} 
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-8 font-normal" 
                      onClick={(e) => {
                        e.preventDefault()
                        setShowAddCategory(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add category
                    </Button>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Due date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 justify-start text-left font-normal min-w-[120px]"
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
            
            {/* Priority selector */}
            <Select 
              value={selectedPriority} 
              onValueChange={(value) => setSelectedPriority(value as 'low' | 'medium' | 'high')}
            >
              <SelectTrigger className="min-w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Tags input */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={addTag}>Add Tag</Button>
            </div>
            
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTag(tag)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Filters and search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant={filterTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Categories tabs */}
        <Tabs defaultValue="all" onValueChange={(value) => setActiveCategory(value)}>
          <TabsList className="w-full justify-start overflow-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
                <Badge variant="secondary" className="ml-1">
                  {todos.filter(todo => todo.category === category).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all" className="pt-4">
            {renderTodoList(sortedTodos)}
          </TabsContent>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="pt-4">
              {renderTodoList(sortedTodos)}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <Separator />
      <CardFooter className="py-3 flex justify-between">
        <p className="text-xs text-muted-foreground">
          {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
        </p>
        <div className="flex gap-2">
          {filterTags.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterTags([])}
              className="h-6 text-xs"
            >
              Clear filters
            </Button>
          )}
          {todos.filter(todo => todo.completed).length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTodos(todos.filter(todo => !todo.completed))}
              className="h-6 text-xs"
            >
              Clear completed
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
  
  function renderTodoList(todos: TodoItem[]) {
    if (todos.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tasks found. {searchQuery || filterTags.length > 0 ? "Try adjusting your filters." : "Add one above!"}
        </p>
      )
    }
    
    return (
      <ul className="space-y-3">
        {todos.map(todo => (
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
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline">{todo.category}</Badge>
                  {todo.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Due date */}
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
                  
                  {/* Priority */}
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
                  
                  {/* Category */}
                  <Select 
                    value={todo.category} 
                    onValueChange={(value) => updateTodoCategory(todo.id, value)}
                  >
                    <SelectTrigger className="h-6 px-2 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
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
    )
  }
} 