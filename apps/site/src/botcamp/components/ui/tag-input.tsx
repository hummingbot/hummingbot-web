"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { Badge } from "@/botcamp/components/ui/badge"
import { Button } from "@/botcamp/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/botcamp/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/botcamp/components/ui/popover"

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  suggestions: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
  /** When false, users can only pick from `suggestions` — no free-text creation. Defaults to true. */
  allowCreate?: boolean
}

export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = "Select or add...",
  disabled = false,
  className,
  allowCreate = true,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleSelect = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item))
    } else {
      onChange([...value, item])
    }
  }

  const handleAddNew = () => {
    if (!allowCreate) return
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue("")
    }
  }

  const handleRemove = (item: string) => {
    onChange(value.filter((v) => v !== item))
  }

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Check if input matches any existing suggestion (case-insensitive)
  const inputMatchesSuggestion = suggestions.some(
    (s) => s.toLowerCase() === inputValue.toLowerCase()
  )

  // Check if input is already selected
  const inputAlreadySelected = value.some(
    (v) => v.toLowerCase() === inputValue.toLowerCase()
  )

  const showAddNew = allowCreate && inputValue.trim() && !inputMatchesSuggestion && !inputAlreadySelected

  return (
    <div className={cn("space-y-bc-2", className)}>
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {item}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {item}</span>
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className="text-muted-foreground">{placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={allowCreate ? "Search or type new..." : "Search..."}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {allowCreate && inputValue.trim() ? (
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-bc-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add &quot;{inputValue.trim()}&quot;
                    </button>
                  ) : (
                    "No matching suggestions"
                  )}
                </CommandEmpty>
                {filteredSuggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {filteredSuggestions.map((item) => (
                      <CommandItem
                        key={item}
                        value={item}
                        onSelect={() => handleSelect(item)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value.includes(item) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {item}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {showAddNew && filteredSuggestions.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={handleAddNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add &quot;{inputValue.trim()}&quot;
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
