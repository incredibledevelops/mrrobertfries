// frontend/app/admin/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiSend("/api/v1/auth/login", "POST", { email, password });
      localStorage.setItem("mrf_token", data.access_token);
      router.push("/admin/dashboard");
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-brand-card border border-gray-700 rounded-3xl p-8 space-y-4">
        <h1 className="font-heading text-2xl font-extrabold text-white text-center">
          Admin Login
        </h1>

        <div>
          <label className="block text-xs font-bold text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
            placeholder="admin@mrfries.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-[10px] text-gray-500 text-center">
          Default: admin@mrfries.com / Admin@1234
        </p>
      </form>
    </div>
  );
}