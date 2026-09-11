import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 text-center">
      <div className="max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="text-sm text-gray-500 mt-2">
          This page needs a connection to load. If you were taking a POS order, don&apos;t worry — it&apos;s saved on this device and will send itself once you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
