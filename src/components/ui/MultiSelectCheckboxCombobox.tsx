'use client';

import * as React from 'react';
import { X, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { touchTargetClasses } from '@/lib/utils/touch-target';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming Checkbox component is available and works as expected

export interface ComboboxOption {
  value: string;
  label: string;
}

interface MultiSelectCheckboxComboboxProps {
  options: ComboboxOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export const MultiSelectCheckboxCombobox: React.FC<MultiSelectCheckboxComboboxProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search options...',
  className,
  triggerClassName,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(''); // For filtering the list

  const handleUnselect = React.useCallback(
    (valueToRemove: string) => {
      onChange(selectedValues.filter((value) => value !== valueToRemove));
    },
    [selectedValues, onChange]
  );

  const handleSelect = React.useCallback(
    (valueToSelect: string) => {
      if (selectedValues.includes(valueToSelect)) {
        handleUnselect(valueToSelect);
      } else {
        onChange([...selectedValues, valueToSelect]);
      }
      // setInputValue(''); // Keep input value for continuous filtering if desired
    },
    [selectedValues, onChange, handleUnselect]
  );

  const displayedSelectedOptions = options.filter(option => selectedValues.includes(option.value));

  return (
    <Popover open={isOpen && !disabled} onOpenChange={(openState) => !disabled && setIsOpen(openState)}>
      <div className={cn('w-full', className)}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            disabled={disabled}
            className={cn(
              'w-full justify-between h-auto min-h-10 items-start',
              triggerClassName,
              disabled && "cursor-not-allowed opacity-50"
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {displayedSelectedOptions.length > 0 ? (
              <div className="flex gap-1 flex-wrap py-1">
                {displayedSelectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className={cn("flex items-center gap-1", touchTargetClasses.clickableBadge)}
                    onClick={(e) => { // Allow clicking badge to unselect
                        e.stopPropagation(); // Prevent popover from closing
                        handleUnselect(option.value);
                    }}
                  >
                    {option.label}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" aria-label={`Remove ${option.label}`} />
                  </Badge>
                ))}
                {displayedSelectedOptions.length !== options.length && displayedSelectedOptions.length > 2 && (
                    <span className="text-xs text-muted-foreground self-center ml-1">
                        + {selectedValues.length - displayedSelectedOptions.length} more
                    </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {isOpen && (
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput 
                        placeholder={searchPlaceholder} 
                        value={inputValue} 
                        onValueChange={setInputValue} 
                        disabled={disabled}
                    />
                    <CommandList>
                        {options.length === 0 && (
                            <CommandItem disabled>No options available.</CommandItem>
                        )}
                        <CommandGroup>
                        {options
                            .filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase()))
                            .map((option) => {
                            const isSelected = selectedValues.includes(option.value);
                            return (
                                <CommandItem
                                key={option.value}
                                value={option.label} // Changed from option.value to option.label for cmdk's internal search
                                onSelect={() => !disabled && handleSelect(option.value)}
                                className={cn("flex items-center justify-between", disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer")}
                                >
                                <div className="flex items-center">
                                    <Checkbox
                                        id={`checkbox-${option.value}`}
                                        checked={isSelected}
                                        onCheckedChange={() => !disabled && handleSelect(option.value)}
                                        className="mr-2 h-4 w-4"
                                        disabled={disabled}
                                    />
                                    <label htmlFor={`checkbox-${option.value}`} className={cn(disabled ? "cursor-not-allowed" : "cursor-pointer")}>
                                        {option.label}
                                    </label>
                                </div>
                                {isSelected && <Check className="h-4 w-4 text-primary" />} 
                                </CommandItem>
                            );
                            })}
                        </CommandGroup>
                        {options.filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase())).length === 0 && options.length > 0 && (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <div>No matching options found.</div>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        )}
      </div>
    </Popover>
  );
}; 