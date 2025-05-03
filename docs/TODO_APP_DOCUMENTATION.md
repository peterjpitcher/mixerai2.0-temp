# Todo App Documentation

## Overview

The Todo app is a feature-rich task management component built for MixerAI 2.0. It allows users to create, manage, and organize tasks with advanced features like priority levels, due dates, and persistent storage.

## Features

- **Task Management**: Add, edit, complete, and delete tasks
- **Priority Levels**: Assign Low, Medium, or High priority to tasks
- **Due Dates**: Set and modify due dates using a calendar interface
- **Persistence**: Tasks are saved to the browser's localStorage
- **Sorting**: Tasks are automatically sorted by completion status, priority, and due date
- **Filtering**: Ability to clear completed tasks
- **Responsive Design**: Works on mobile and desktop devices

## Implementation Details

### Data Structure

Tasks are stored as objects with the following structure:

```typescript
interface TodoItem {
  id: string          // Unique identifier (UUID)
  text: string        // Task description
  completed: boolean  // Completion status
  dueDate?: Date      // Optional due date
  priority: 'low' | 'medium' | 'high'  // Priority level
}
```

### State Management

The component uses React's useState and useEffect hooks to:
- Manage the list of tasks
- Control input fields for new tasks
- Save and load tasks from localStorage
- Track task properties (due dates, priority)

### Sorting Logic

Tasks are sorted in this order:
1. Incomplete tasks before completed tasks
2. High priority before medium priority before low priority
3. Tasks with earlier due dates first
4. Tasks without due dates last

### UI Components

The Todo app uses several UI components from the project:
- Card, CardHeader, CardContent, CardFooter for the container
- Button for actions
- Checkbox for task completion
- Input for adding new tasks
- Popover and Calendar for date selection
- Select for priority levels

### LocalStorage Integration

The app implements browser persistence through localStorage:
- Tasks are saved whenever the todo list changes
- Tasks are loaded when the component mounts
- Date objects are properly serialized and deserialized

## App Location

The Todo app is now located at `/todo-app` and can be accessed directly at:
```
http://localhost:3000/todo-app
```

For backward compatibility, the old route at `/examples/todo-example` still works but redirects to the new location.

## Usage Example

```tsx
import { Todo } from "@/components/Todo"

export default function TodoExample() {
  return (
    <div className="container">
      <Todo title="My Tasks" />
    </div>
  )
}
```

## Future Enhancements

Potential improvements for the Todo app:
- Categories or tags for tasks
- Search functionality
- Task notes or descriptions
- Recurring tasks
- Shared task lists (would require backend integration)
- Dark mode support
- Drag and drop for reordering tasks

## Technical Considerations

- The app uses client-side rendering ('use client' directive)
- All UI components are from the Radix UI library with Tailwind styling
- The date-fns library is used for date formatting and manipulation 