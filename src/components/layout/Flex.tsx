import { cn } from "@/lib/utils"

interface FlexProps {
  children: React.ReactNode
  className?: string
  direction?: "row" | "column" | "row-reverse" | "column-reverse"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  wrap?: "nowrap" | "wrap" | "wrap-reverse"
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
}

const directionClasses = {
  row: "flex-row",
  column: "flex-col",
  "row-reverse": "flex-row-reverse",
  "column-reverse": "flex-col-reverse"
}

const alignClasses = {
  start: "items-start",
  center: "items-center", 
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline"
}

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end", 
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly"
}

const wrapClasses = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
  "wrap-reverse": "flex-wrap-reverse"
}

const gapClasses = {
  none: "",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4", 
  lg: "gap-6",
  xl: "gap-8"
}

export function Flex({ 
  children, 
  className,
  direction = "row",
  align = "start",
  justify = "start", 
  wrap = "nowrap",
  gap = "md"
}: FlexProps) {
  return (
    <div className={cn(
      "flex",
      directionClasses[direction],
      alignClasses[align],
      justifyClasses[justify],
      wrapClasses[wrap],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}
