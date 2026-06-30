"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BrandHeader } from "@/components/BrandHeader";

type Status = "idle" | "loading" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setStatus("error");
      setErrorMessage("Informe email e senha.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMessage("Email ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md p-8">
        <BrandHeader title="Acesso ao Dashboard" subtitle="Entre com sua conta de administrador." />

        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              placeholder="voce@empresa.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "loading"}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          {status === "error" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={status === "loading"}
            style={{ backgroundColor: "#084897", color: "#ffffff" }}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
