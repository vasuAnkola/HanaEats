"use client";

import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
}

export function DataTable<T extends object>({
  data,
  columns,
  searchKeys = [],
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyMessage = "No records found.",
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String((row as Record<keyof T, unknown>)[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sorted.length);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider h-10 ${col.sortable ? "cursor-pointer select-none hover:text-gray-700" : ""} ${col.className ?? ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-indigo-500">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-16 text-sm text-gray-400">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow key={i} className="hover:bg-gray-50/60 transition-colors border-gray-50">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`py-3 text-sm ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <p className="text-xs">
          {sorted.length === 0
            ? "No results"
            : `Showing ${from}–${to} of ${sorted.length} result${sorted.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPage(1)} disabled={currentPage === 1}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="px-3 text-xs font-medium text-gray-700">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
