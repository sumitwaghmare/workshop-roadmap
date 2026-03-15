"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        toast.success("Login successful");
        router.push("/admin");
      } else {
        toast.error("Invalid credentials");
      }
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tighter text-blue-500">
            Workshop Roadmap
          </h1>
          <p className="text-lg text-slate-300 font-bold">
            Strategic Technology Planning Tool
          </p>
        </div>

        <Card className="bg-slate-800 border-slate-700 shadow-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white">Admin Login</CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Authorized access only. Enter credentials to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="ml-1">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="ml-1">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-lg font-bold shadow-lg active:scale-[0.98]" disabled={loading}>
                {loading ? "Verifying..." : "Unlock Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 font-bold">
          Group leaders: Use the unique link provided for your session.
        </p>
      </div>
    </div>
  );
}
