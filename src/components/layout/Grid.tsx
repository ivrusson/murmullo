import { cn } from "@/lib/utils"

interface GridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
  autoFit?: boolean
}

const colsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2", 
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12"
}

const gapClasses = {
  none: "",
  xs: "gap-1",
  sm: "gap-2", 
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8"
}

export function Grid({ 
  children, 
  className,
  cols = 1,
  gap = "md",
  autoFit = false
}: GridProps) {
  return (
    <div className={cn(
      "grid",
      autoFit ? "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]" : colsClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}
