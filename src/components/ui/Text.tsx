import { cn } from "@/lib/utils"

interface TextProps {
  children: React.ReactNode
  className?: string
  size?: "xs" | "sm" | "md" | "lg"
  weight?: "normal" | "medium" | "semibold"
  color?: "default" | "muted" | "secondary" | "destructive"
  align?: "left" | "center" | "right"
}

const sizeClasses = {
  xs: "text-xs",
  sm: "text-sm", 
  md: "text-base",
  lg: "text-lg"
}

const weightClasses = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold"
}

const colorClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive"
}

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
}

export function Text({ 
  children, 
  className,
  size = "md",
  weight = "normal",
  color = "default",
  align = "left"
}: TextProps) {
  return (
    <p className={cn(
      sizeClasses[size],
      weightClasses[weight],
      colorClasses[color],
      alignClasses[align],
      className
    )}>
      {children}
    </p>
  )
}
