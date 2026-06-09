import * as React from "react"
import { cn } from "../../lib/utils"

type TooltipPlacement = "top" | "bottom" | "left" | "right"

interface TooltipProps {
  content: React.ReactNode
  placement?: TooltipPlacement
  children: React.ReactElement
  className?: string
}

const placementClasses: Record<TooltipPlacement, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
}

function Tooltip({ content, placement = "top", children, className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95",
            placementClasses[placement],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }
