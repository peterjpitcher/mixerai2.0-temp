'use client';

import * as React from 'react';
import { X, UserSearch } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import { toast } from 'sonner';
import { debounce } from 'lodash';

import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null; // Optional, as it's for display
}

interface MultiSelectUserComboboxProps {
  selectedUsers: UserOption[];
  onChange: (users: UserOption[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelectUserCombobox: React.FC<MultiSelectUserComboboxProps> = ({
  selectedUsers,
  onChange,
  placeholder = 'Search and add users...',
  className,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleUnselect = React.useCallback(
    (userToRemove: UserOption) => {
      onChange(selectedUsers.filter((user) => user.id !== userToRemove.id));
    },
    [selectedUsers, onChange]
  );

  const handleSelect = React.useCallback(
    (userToSelect: UserOption) => {
      if (!selectedUsers.find(user => user.id === userToSelect.id)) {
        onChange([...selectedUsers, userToSelect]);
      }
      setInputValue('');
      setSearchResults([]);
      // setIsOpen(false); // Keep open if they want to add more quickly? Or close.
      // inputRef.current?.focus(); 
    },
    [selectedUsers, onChange]
  );
  
  const debouncedSearch = React.useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}&limit=10`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
          setSearchResults(data.users);
        } else {
          setSearchResults([]);
        }
      } catch (error: any) {
        console.error('Error searching users:', error);
        toast.error(`Error searching users: ${error.message}`);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  React.useEffect(() => {
    if (inputValue.trim()) {
        setIsOpen(true); // Open when user starts typing
        debouncedSearch(inputValue);
    } else {
        setIsOpen(false); // Close if input is empty
        setSearchResults([]);
    }
  }, [inputValue, debouncedSearch]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '' && selectedUsers.length > 0) {
            const lastSelectedUser = selectedUsers[selectedUsers.length - 1];
            handleUnselect(lastSelectedUser);
          }
        }
        if (e.key === 'Escape') {
          input.blur();
          setIsOpen(false);
        }
      }
    },
    [selectedUsers, handleUnselect]
  );

  // Use a ref for the trigger element to manage PopoverContent width
  const triggerRef = React.useRef<HTMLDivElement>(null);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('w-full', className)} ref={triggerRef}>
        <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
          <PopoverTrigger asChild>
            <div 
              className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              onClick={() => inputRef.current?.focus()} // Focus input when clicking the area
            >
              <div className="flex gap-1 flex-wrap items-center">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {user.full_name || user.email}
                    <button
                      type="button"
                      aria-label={`Remove ${user.full_name || user.email}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent Popover from closing if it's part of the trigger
                        handleUnselect(user);
                      }}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={inputValue}
                  onValueChange={setInputValue}
                  onFocus={() => setIsOpen(true)} 
                  // onBlur is tricky with popover, handled by onInteractOutside in PopoverContent
                  placeholder={selectedUsers.length > 0 ? 'Add more...' : placeholder}
                  className="bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[100px] h-full py-0.5"
                  style={{ flexGrow: 1 }}
                />
              </div>
            </div>
          </PopoverTrigger>
          {/* PopoverContent is now a direct child of Popover (conditionally rendered via open state) */}
          {isOpen && (
            <PopoverContent
                className="p-0" // Removed w-[--radix-popover-trigger-width] as it will be set by popover
                style={{ width: triggerRef.current?.offsetWidth ? `${triggerRef.current.offsetWidth}px` : 'auto' }}
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()} 
                onInteractOutside={(e) => {
                    // Do not close if interaction is within the triggerRef (which contains the input)
                    if (triggerRef.current && triggerRef.current.contains(e.target as Node)) {
                        return;
                    }
                    setIsOpen(false);
                }}
              >
                <CommandList>
                  {isLoading && (
                    <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                  )}
                  {!isLoading && searchResults.length === 0 && inputValue.trim() !== '' && (
                    <div className="p-2 text-center text-sm text-muted-foreground">No users found.</div>
                  )}
                  {!isLoading && searchResults.length === 0 && inputValue.trim() === '' && selectedUsers.length < 1 && (
                     <div className="p-2 text-center text-sm text-muted-foreground">Start typing to search...</div>
                  )}
                  <CommandGroup>
                    {searchResults.map((user) => {
                      const isSelected = selectedUsers.some(su => su.id === user.id);
                      return (
                        <CommandItem
                          key={user.id}
                          value={user.id} 
                          onSelect={() => {
                            if (!isSelected) {
                              handleSelect(user);
                            }
                          }}
                          disabled={isSelected}
                          className={cn(
                            "flex items-center justify-between cursor-pointer",
                            isSelected && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center">
                             <UserSearch className="h-5 w-5 mr-2 text-muted-foreground" />
                             <span>{user.full_name || 'N/A'}</span>
                             <span className="text-xs text-muted-foreground ml-2">{user.email}</span>
                          </div>
                          {isSelected && <span className="text-xs text-muted-foreground">Added</span>}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </PopoverContent>
          )}
        </Command>
      </div>
    </Popover>
  );
}; 