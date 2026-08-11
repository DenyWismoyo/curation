import { cn } from "../../utils/cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800/50", className)}
      {...props}
    />
  )
}

export { Skeleton }
