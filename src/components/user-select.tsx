import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Button } from './button';
import { PlusIcon, UserIcon, XIcon } from 'lucide-react';
import { useDebounce } from '@/lib/hooks';

interface User {
  id: string;
  email: string;
  full_name: string;
  job_title?: string;
  avatar_url?: string;
}

interface UserSelectProps {
  onSelect: (value: { email: string; id?: string }) => void;
  placeholder?: string;
  className?: string;
}

export function UserSelect({ onSelect, placeholder = "Search users or enter email", className = "" }: UserSelectProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Search for users based on debounced input
  useEffect(() => {
    if (!isOpen) return;
    
    async function searchUsers() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(debouncedSearchTerm)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUsers(data.users);
          }
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    searchUsers();
  }, [debouncedSearchTerm, isOpen]);
  
  // Email validation
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };
  
  const handleUserSelect = (user: User) => {
    onSelect({ email: user.email, id: user.id });
    setInputValue('');
    setIsOpen(false);
  };
  
  const handleAddNew = () => {
    if (isValidEmail(inputValue)) {
      onSelect({ email: inputValue });
      setInputValue('');
      setIsOpen(false);
    }
  };
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue && setIsOpen(true)}
          className="flex-1"
        />
        {isValidEmail(inputValue) && (
          <Button 
            type="button" 
            size="sm" 
            className="ml-2"
            onClick={handleAddNew}
          >
            <PlusIcon className="h-4 w-4 mr-1" /> 
            Add
          </Button>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-80 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : users.length > 0 ? (
            <div>
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            isValidEmail(inputValue) ? (
              <div className="p-3">
                <button
                  type="button"
                  className="w-full p-2 text-left hover:bg-accent rounded-md flex items-center justify-between"
                  onClick={handleAddNew}
                >
                  <div className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4 text-primary" />
                    <span>Invite {inputValue}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">New user</span>
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No users found. Enter a valid email to invite.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
} 