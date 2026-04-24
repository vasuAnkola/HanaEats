"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* dot grid */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* glow blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#1E3A5F]/40 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8">
            <Image src="/mainlogo2.png" alt="HANAEats" width={200} height={60} className="object-contain brightness-0 invert" priority />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Welcome to HANAEats</h1>
          <p className="text-blue-200 text-base max-w-xs leading-relaxed">
            The all-in-one POS & restaurant management platform built for Southeast Asia.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-xs">
            {[
              { label: "Outlets", value: "Multi-branch" },
              { label: "Languages", value: "5 SE Asian" },
              { label: "Payment", value: "9 Methods" },
              { label: "Reports", value: "Real-time" },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl px-4 py-3 text-left backdrop-blur-sm">
                <p className="text-white font-bold text-sm">{item.value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/mainlogo2.png" alt="HANAEats" width={160} height={48} className="object-contain" priority />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1E3A5F]">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-xl border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold text-base shadow-md shadow-blue-500/20"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </span>
              ) : "Sign in"}
            </Button>
          </form>

          {/* Demo credentials */}
          {/* <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2.5">Demo credentials</p>
            <div className="text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-[#1E3A5F] font-semibold">superadmin@hanaeats.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Password</span>
                <span className="text-[#1E3A5F] font-semibold">admin123456</span>
              </div>
            </div>
          </div> */}

          <p className="text-center text-xs text-gray-400 mt-6">© 2025 HANAEats · Built for Southeast Asia</p>
        </div>
      </div>
    </div>
  );
}
