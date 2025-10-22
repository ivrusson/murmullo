import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface IconProps {
  icon: LucideIcon
  className?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  color?: "default" | "muted" | "primary" | "destructive" | "success"
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4", 
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8"
}

const colorClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
  success: "text-green-600"
}

export function Icon({ 
  icon: IconComponent, 
  className,
  size = "md",
  color = "default"
}: IconProps) {
  return (
    <IconComponent className={cn(
      sizeClasses[size],
      colorClasses[color],
      className
    )} />
  )
}
