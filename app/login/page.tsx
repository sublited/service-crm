"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { company_name: companyName || "My Business" } },
      });
      if (error) setError(error.message);
      else setNotice("Check your email to confirm your account, then sign in.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-center mb-1">Service CRM</h1>
        <p className="text-center text-sm text-ink/50 mb-8">
          {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
        </p>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="label">Business name</label>
              <input
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Sparkle & Shine Cleaning Co."
              />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-brand-600">{notice}</p>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="w-full text-center text-sm text-ink/50 mt-4 hover:text-ink/80"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need a workspace? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
