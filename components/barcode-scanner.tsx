"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

const ELEMENT_ID = "barcode-scanner-region";

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
        },
        () => { /* per-frame decode misses — expected while aiming, ignore */ }
      ).catch(() => setError("Couldn't access the camera. Check permissions and try again."));
    });

    return () => {
      cancelled = true;
      scannerRef.current?.stop().then(() => scannerRef.current?.clear()).catch(() => {});
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine className="w-4 h-4 text-brand-primary" /> Scan Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          ) : (
            <p className="text-xs text-gray-500">Point the camera at an ingredient's barcode or a printed QR code.</p>
          )}
          <div id={ELEMENT_ID} className="rounded-xl overflow-hidden bg-gray-900 min-h-[220px] flex items-center justify-center">
            {!error && <Loader2 className="w-6 h-6 animate-spin text-white/40" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
