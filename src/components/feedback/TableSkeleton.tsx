import { Skeleton } from "../ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 flex-1"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-8 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export { TableSkeleton }
