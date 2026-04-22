import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="h-14 border-b border-gray-100 bg-white flex items-center px-6">
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="p-6">
        <TableSkeleton rows={7} cols={5} />
      </div>
    </div>
  );
}
