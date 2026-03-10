import { Skeleton } from "@/components/ui/skeleton";

export const PageHeaderSkeleton = () => (
    <div className="flex flex-col gap-2 mb-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
    </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-xl bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                    ))}
                </div>
            </div>
            <div className="p-4 space-y-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const CardGridSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-card border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>
        ))}
    </div>
);
