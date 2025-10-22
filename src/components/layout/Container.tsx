import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
  padding?: "none" | "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full"
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8"
}

export function Container({ 
  children, 
  className, 
  size = "lg", 
  padding = "md" 
}: ContainerProps) {
  return (
    <div className={cn(
      "mx-auto w-full",
      sizeClasses[size],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}
