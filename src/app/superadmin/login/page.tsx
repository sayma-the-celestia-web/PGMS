"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { superadminLoginAction } from "@/lib/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, AlertTriangle, ArrowLeft } from "lucide-react";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both administrator email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await superadminLoginAction(password, email.trim());
      if (res.success) {
        router.push("/superadmin");
        router.refresh();
      } else {
        setError(res.error || "Invalid administrator credentials.");
      }
    } catch (err: any) {
      setError(err?.message || "Login authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-16">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-diu-navy to-diu-blue text-white pb-6 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Superadmin Portal
                </span>
              </div>
              <CardTitle className="text-xl font-bold font-heading text-white">
                Superadmin Login
              </CardTitle>
              <CardDescription className="text-xs text-blue-100/90 leading-relaxed">
                Enter authorized departmental administrator credentials to access the PGMS Superadmin Console.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                {error && (
                  <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Administrator Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. sweadmin@daffodilvarsity.edu.bd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11 sm:h-9 text-sm sm:text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Security Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter administrator password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 sm:h-9 text-sm sm:text-xs"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2 pb-6 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-9 gap-2 font-semibold text-sm sm:text-xs shadow-sm bg-diu-blue hover:bg-diu-navy"
                >
                  {loading ? (
                    "Authenticating..."
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Login to Admin Console
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-diu-blue font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Return to Homepage
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
