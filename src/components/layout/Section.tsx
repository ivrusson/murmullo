import { cn } from "@/lib/utils"

interface SectionProps {
  children: React.ReactNode
  className?: string
  spacing?: "none" | "sm" | "md" | "lg" | "xl"
  background?: "default" | "muted" | "accent"
}

const spacingClasses = {
  none: "",
  sm: "py-4",
  md: "py-8", 
  lg: "py-12",
  xl: "py-16"
}

const backgroundClasses = {
  default: "",
  muted: "bg-muted",
  accent: "bg-accent"
}

export function Section({ 
  children, 
  className,
  spacing = "md",
  background = "default"
}: SectionProps) {
  return (
    <section className={cn(
      "w-full",
      spacingClasses[spacing],
      backgroundClasses[background],
      className
    )}>
      {children}
    </section>
  )
}
