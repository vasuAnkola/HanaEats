import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-2.5 w-20 rounded" />
              </div>
            </div>
            {Array.from({ length: cols - 2 }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 rounded" style={{ width: `${50 + (j % 4) * 15}px` }} />
            ))}
            <div className="flex gap-1 ml-auto">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-36 rounded" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}
