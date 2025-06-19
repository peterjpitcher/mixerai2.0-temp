'use client';

import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReactNode } from 'react';
import { touchFriendly } from '@/lib/utils/touch-target';

interface ActionButtonsProps {
  viewHref?: string;
  editHref?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  viewLabel?: string;
  editLabel?: string;
  isCompact?: boolean;
  deleteButton?: ReactNode; // For custom delete implementations like dialogs
  additionalActions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    href?: string;
  }>;
}

/**
 * Standardized action buttons component for consistent UI across all listing pages.
 * 
 * @param viewHref - URL for the view action
 * @param editHref - URL for the edit action
 * @param onDelete - Callback for delete action (use deleteButton for custom implementations)
 * @param deleteLabel - Custom label for delete button (default: "Delete")
 * @param viewLabel - Custom label for view button (default: "View")
 * @param editLabel - Custom label for edit button (default: "Edit")
 * @param isCompact - Whether to use a dropdown menu for compact display
 * @param deleteButton - Custom delete button component (e.g., wrapped in a dialog)
 * @param additionalActions - Additional custom actions
 */
export function ActionButtons({
  viewHref,
  editHref,
  onDelete,
  deleteLabel = 'Delete',
  viewLabel = 'View',
  editLabel = 'Edit',
  isCompact = false,
  deleteButton,
  additionalActions = [],
}: ActionButtonsProps) {
  // For compact mode, use dropdown menu
  if (isCompact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={touchFriendly('tableAction')}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {viewHref && (
            <DropdownMenuItem asChild>
              <Link href={viewHref} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                {viewLabel}
              </Link>
            </DropdownMenuItem>
          )}
          {editHref && (
            <DropdownMenuItem asChild>
              <Link href={editHref} className="flex items-center">
                <Pencil className="mr-2 h-4 w-4" />
                {editLabel}
              </Link>
            </DropdownMenuItem>
          )}
          {additionalActions.map((action, index) => (
            action.href ? (
              <DropdownMenuItem key={index} asChild>
                <Link href={action.href} className="flex items-center">
                  {action.icon}
                  {action.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={index} onClick={action.onClick} className="flex items-center">
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            )
          ))}
          {(onDelete || deleteButton) && (
            <DropdownMenuItem
              onClick={onDelete}
              className="flex items-center text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Standard button layout
  return (
    <div className="flex items-center gap-2">
      {viewHref && (
        <Button variant="outline" size="sm" asChild>
          <Link href={viewHref} className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            {viewLabel}
          </Link>
        </Button>
      )}
      {editHref && (
        <Button variant="outline" size="sm" asChild>
          <Link href={editHref} className="flex items-center">
            <Pencil className="mr-2 h-4 w-4" />
            {editLabel}
          </Link>
        </Button>
      )}
      {additionalActions.map((action, index) => (
        action.href ? (
          <Button key={index} variant="outline" size="sm" asChild>
            <Link href={action.href} className="flex items-center">
              {action.icon}
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button key={index} variant="outline" size="sm" onClick={action.onClick}>
            {action.icon}
            {action.label}
          </Button>
        )
      ))}
      {deleteButton || (onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteLabel}
        </Button>
      ))}
    </div>
  );
}