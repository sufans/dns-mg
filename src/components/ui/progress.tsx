import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const progressVariants = cva("relative h-2 w-full overflow-hidden rounded-full bg-secondary", {
  variants: {
    variant: {
      primary: "[&>div]:bg-primary",
      success: "[&>div]:bg-success",
      warning: "[&>div]:bg-warning",
      destructive: "[&>div]:bg-destructive",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
})

export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof progressVariants> {
  value?: number
  label?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, variant, label, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value))

    return (
      <div className="w-full">
        {label && (
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{clampedValue}%</span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(progressVariants({ variant }), className)}
          {...props}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
