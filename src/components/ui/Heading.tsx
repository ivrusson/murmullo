import { cn } from "@/lib/utils"

interface HeadingProps {
  children: React.ReactNode
  className?: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  weight?: "normal" | "medium" | "semibold" | "bold"
  color?: "default" | "muted" | "primary"
}

const levelClasses = {
  1: "text-3xl",
  2: "text-2xl", 
  3: "text-xl",
  4: "text-lg",
  5: "text-base",
  6: "text-sm"
}

const sizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg", 
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl"
}

const weightClasses = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold"
}

const colorClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary"
}

export function Heading({ 
  children, 
  className,
  level = 1,
  size,
  weight = "semibold",
  color = "default"
}: HeadingProps) {
  const Component = `h${level}` as keyof JSX.IntrinsicElements
  const sizeClass = size ? sizeClasses[size] : levelClasses[level]
  
  return (
    <Component className={cn(
      sizeClass,
      weightClasses[weight],
      colorClasses[color],
      "tracking-tight",
      className
    )}>
      {children}
    </Component>
  )
}
