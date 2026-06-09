import * as React from "react"
import { cn } from "../../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "rect" | "circle" | "text"
  lines?: number
}

function Skeleton({ className, shape = "rect", lines, ...props }: SkeletonProps) {
  if (shape === "text" && lines) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 animate-pulse rounded bg-muted",
              i === lines - 1 && "w-3/4"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        shape === "circle" && "rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
