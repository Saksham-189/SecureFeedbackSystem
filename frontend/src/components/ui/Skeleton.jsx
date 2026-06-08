import { cn } from "../../utils/cn";

/**
 * Skeleton — shimmer placeholder for loading states.
 * Renders a pulsing block matching the approximate shape of content.
 */

const Skeleton = ({ className = "", rounded = "rounded" }) => (
    <div
        className={cn(
            "animate-shimmer",
            rounded,
            className
        )}
        aria-hidden="true"
    />
);

/** Pre-composed skeleton patterns for common layouts */

Skeleton.Text = ({ lines = 3, className = "" }) => (
    <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={cn(
                    "h-4",
                    i === lines - 1 ? "w-3/4" : "w-full"
                )}
            />
        ))}
    </div>
);

Skeleton.Card = ({ className = "" }) => (
    <div
        className={cn(
            "bg-white border border-[#c6c6cd] rounded p-6 space-y-4",
            className
        )}
    >
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
    </div>
);

Skeleton.Table = ({ rows = 5, cols = 4, className = "" }) => (
    <div className={cn("space-y-3", className)}>
        <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="flex gap-4">
                {Array.from({ length: cols }).map((_, col) => (
                    <Skeleton
                        key={col}
                        className="h-10 flex-1"
                        rounded="rounded"
                    />
                ))}
            </div>
        ))}
    </div>
);

Skeleton.Dashboard = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton.Card key={i} />
            ))}
        </div>
        <div className="bg-white border border-[#c6c6cd] rounded p-8">
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Skeleton.Text lines={5} />
        </div>
    </div>
);

export default Skeleton;
