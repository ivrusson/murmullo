import { cn } from "@/lib/utils"

interface SpacerProps {
  className?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  axis?: "x" | "y" | "both"
}

const sizeClasses = {
  xs: {
    x: "w-1",
    y: "h-1", 
    both: "w-1 h-1"
  },
  sm: {
    x: "w-2",
    y: "h-2",
    both: "w-2 h-2"
  },
  md: {
    x: "w-4",
    y: "h-4",
    both: "w-4 h-4"
  },
  lg: {
    x: "w-6", 
    y: "h-6",
    both: "w-6 h-6"
  },
  xl: {
    x: "w-8",
    y: "h-8",
    both: "w-8 h-8"
  },
  "2xl": {
    x: "w-12",
    y: "h-12", 
    both: "w-12 h-12"
  }
}

export function Spacer({ 
  className,
  size = "md",
  axis = "y"
}: SpacerProps) {
  return (
    <div className={cn(
      sizeClasses[size][axis],
      className
    )} />
  )
}
