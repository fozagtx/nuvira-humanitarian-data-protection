import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-2xl" />
            <Skeleton className="h-8 w-20 rounded-2xl" />
            <Skeleton className="h-8 w-24 rounded-2xl" />
            <Skeleton className="h-8 w-16 rounded-2xl" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
        <Skeleton className="h-12 w-72 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 rounded-[10px]" />
          <Skeleton className="h-32 rounded-[10px]" />
          <Skeleton className="h-32 rounded-[10px]" />
          <Skeleton className="h-32 rounded-[10px]" />
        </div>
        <Skeleton className="h-64 rounded-[10px]" />
      </div>
    </div>
  );
}
