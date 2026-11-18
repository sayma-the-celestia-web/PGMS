"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { superadminLoginAction } from "@/lib/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, AlertTriangle, ArrowLeft, KeyRound } from "lucide-react";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("sweadmin@daffodilvarsity.edu.bd");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await superadminLoginAction(password, email);
      if (res.success) {
        router.push("/superadmin");
        router.refresh();
      } else {
        setError(res.error || "Invalid password or email");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setPassword("diu2026");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-diu-blue flex items-center justify-center text-white mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Superadmin Authentication
          </h1>
          <p className="text-xs text-slate-400">
            Daffodil International University • Department of Software Engineering
          </p>
        </div>

        <Card className="border border-slate-800 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base text-white">Administrative Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Only authorized departmental administrators may access this portal.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-300">
                  Administrator Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-300">
                  Security Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white text-sm"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Demo Password: <strong className="text-diu-accent font-mono">diu2026</strong></span>
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="text-xs text-diu-blue hover:underline"
                >
                  Fill Demo
                </button>
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex flex-col gap-3">
              <Button type="submit" disabled={loading} className="w-full font-semibold">
                {loading ? "Authenticating..." : "Access Admin Console"}
              </Button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Public Website
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
