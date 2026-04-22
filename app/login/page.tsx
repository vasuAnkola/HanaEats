"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HANAEats</h1>
          <p className="text-sm text-gray-500 mt-1">Southeast Asia POS Platform</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sign in to your account</h2>
            <p className="text-sm text-gray-500">Enter your credentials to continue</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
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
            <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Demo credentials</p>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p><span className="font-medium">Email:</span> superadmin@hanaeats.com</p>
                <p><span className="font-medium">Password:</span> admin123456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2024 HANAEats · Built for Southeast Asia
        </p>
      </div>
    </div>
  );
}
