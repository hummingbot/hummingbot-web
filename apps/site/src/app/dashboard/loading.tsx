import { Skeleton } from "@/botcamp/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-bc-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-bc-2">
        <Skeleton className="h-8 w-48 bg-primary/10" />
        <Skeleton className="h-4 w-64 bg-primary/10" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-bc-lg border p-4 space-y-bc-3">
            <Skeleton className="h-4 w-3/4 bg-primary/10" />
            <Skeleton className="h-4 w-1/2 bg-primary/10" />
            <Skeleton className="h-20 w-full bg-primary/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
