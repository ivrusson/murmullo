import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboBoxProps {
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

export function ComboBox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  triggerClassName,
  contentClassName,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background border-border hover:bg-accent hover:text-accent-foreground text-left",
            !selectedOption && "text-muted-foreground",
            triggerClassName
          )}
          disabled={disabled}
        >
          <span className="flex-1 truncate pr-2">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-lg", contentClassName)}>
        <Command className="bg-popover border-0">
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="bg-popover border-0 text-popover-foreground placeholder:text-muted-foreground focus:ring-0"
          />
          <CommandList className="bg-popover max-h-[200px]">
            <CommandEmpty className="text-muted-foreground py-2">{emptyText}</CommandEmpty>
            <CommandGroup className="bg-popover">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  disabled={option.disabled}
                  className="bg-popover text-popover-foreground hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
