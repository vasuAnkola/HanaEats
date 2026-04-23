"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, QrCode, Download, RefreshCw } from "lucide-react";

interface Outlet { id: number; name: string; }
interface TableRow {
  id: number;
  table_number: string;
  capacity: number;
  status: string;
}
interface QrInfo {
  token: string;
  qr_url: string;
  expires_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  occupied:  "bg-red-100 text-red-600",
  reserved:  "bg-amber-100 text-amber-700",
  cleaning:  "bg-blue-100 text-blue-700",
};

export default function QrPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [qrMap, setQrMap] = useState<Record<number, QrInfo>>({});

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length > 0) setOutletId(String(list[0].id));
    });
  }, []);

  const loadTables = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    const res = await fetch(`/api/tables?outlet_id=${outletId}`);
    const data = await res.json();
    setTables(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [outletId]);

  useEffect(() => {
    setQrMap({});
    loadTables();
  }, [loadTables]);

  async function generateQr(tableId: number) {
    setGeneratingId(tableId);
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: tableId, outlet_id: parseInt(outletId) }),
    });
    const data = await res.json();
    if (res.ok) {
      setQrMap(prev => ({ ...prev, [tableId]: data as QrInfo }));
    }
    setGeneratingId(null);
  }

  function getQrImageUrl(token: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/qr/${token}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  function getQrPageUrl(token: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/qr/${token}`;
  }

  return (
    <div>
      <Header title="QR Codes" subtitle="Generate table QR codes for self-ordering" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={loadTables} variant="ghost" size="icon" className="text-gray-400 hover:text-indigo-600">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : tables.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">No tables found. Add tables first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map(table => {
              const qr = qrMap[table.id];
              const isGenerating = generatingId === table.id;

              return (
                <div key={table.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">Table {table.table_number}</p>
                      <p className="text-xs text-gray-500">{table.capacity} seats</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[table.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {table.status}
                    </span>
                  </div>

                  {qr ? (
                    <div className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getQrImageUrl(qr.token)}
                        alt={`QR for table ${table.table_number}`}
                        width={160}
                        height={160}
                        className="rounded-lg border border-gray-100"
                      />
                      <p className="text-[10px] text-gray-400">
                        Expires: {new Date(qr.expires_at).toLocaleString()}
                      </p>
                      <div className="flex gap-2 w-full">
                        <a
                          href={getQrImageUrl(qr.token)}
                          download={`qr-table-${table.table_number}.png`}
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-1.5 font-medium transition-colors"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <a
                          href={getQrPageUrl(qr.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg py-1.5 font-medium transition-colors"
                        >
                          Preview
                        </a>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => generateQr(table.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Regenerate
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-gray-300" />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateQr(table.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <QrCode className="w-3 h-3 mr-1" />}
                        Generate QR
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
