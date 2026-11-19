import { Skeleton } from "@/botcamp/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-bc-6">
      {/* Header skeleton */}
      <div className="space-y-bc-2">
        <Skeleton className="h-8 w-48 bg-primary/10" />
        <Skeleton className="h-4 w-64 bg-primary/10" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-bc-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-32 bg-primary/10" />
        </div>
        <div className="p-4 space-y-bc-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-primary/10" />
              <Skeleton className="h-4 flex-1 bg-primary/10" />
              <Skeleton className="h-4 w-24 bg-primary/10" />
              <Skeleton className="h-4 w-16 bg-primary/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
