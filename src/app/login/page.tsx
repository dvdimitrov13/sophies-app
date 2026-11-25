"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-lime-400 text-3xl font-black text-on-lime shadow-[inset_0_-4px_0_rgba(20,23,15,0.15)]">
            Б
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bulganki
          </h1>
          <p className="text-muted mt-1">Sign in to keep your streak going</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="surface p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="eyebrow mb-1.5 block"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="sophie@coolness.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="eyebrow mb-1.5 block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
            />
          </div>

          {error && (
            <p className="text-orange-600 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
