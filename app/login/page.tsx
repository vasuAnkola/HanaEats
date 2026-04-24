"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 sm:w-96 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 sm:w-96 sm:h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className=" rounded-2xl flex items-center justify-center mb-5 shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
            <Image
              src="/mainlogo2.png"
              alt="HANAEats"
              width={164}
              height={164}
              className="w-24 h-24 object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">HANAEats</h1>
          <p className="text-sm text-slate-400 mt-1.5">Southeast Asia POS Platform</p>
        </div>

        <Card className="bg-white/[0.06] border-white/10 backdrop-blur-md shadow-2xl">
          <CardContent className="p-6 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Welcome back</h2>
              <p className="text-sm text-slate-400 mt-0.5">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-lg"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all rounded-lg mt-1"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-5 p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.08]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                Demo credentials
              </p>
              <div className="text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-300 font-medium">superadmin@hanaeats.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Password</span>
                  <span className="text-slate-300 font-medium">admin123456</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2024 HANAEats · Built for Southeast Asia
        </p>
      </div>
    </div>
  );
}
