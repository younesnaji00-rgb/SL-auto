import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-3", className)}
      {...props}
    />
  )
}

function SkeletonRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-12 w-full items-center gap-4 border-b border-hairline px-4", className)}
      {...props}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("paper flex flex-col gap-3 p-5", className)}
      {...props}
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

function SkeletonChart({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const heights = ["40%", "70%", "55%", "85%", "60%"]
  return (
    <div
      className={cn("paper flex h-48 w-full items-end gap-3 p-5", className)}
      {...props}
    >
      {heights.map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: h }} />
      ))}
    </div>
  )
}

function SkeletonAvatar({ className, size = "md", ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }
  return <Skeleton className={cn("rounded-full", sizes[size], className)} {...props} />
}

export { Skeleton, SkeletonRow, SkeletonCard, SkeletonChart, SkeletonAvatar }
