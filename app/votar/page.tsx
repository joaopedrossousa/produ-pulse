"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BrandHeader } from "@/components/BrandHeader";

const KPIS = [
  "Atendimento",
  "Qualidade do Produto",
  "Prazo de Entrega",
  "Suporte Técnico",
  "Custo-Benefício",
] as const;

const SETORES = ["Comercial", "Administrativo", "Finanças", "Estoque"];

const NOTAS = Array.from({ length: 11 }, (_, i) => i);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "loading" | "success" | "error";

type FieldErrors = {
  nome?: string;
  email?: string;
  setor?: string;
};

export default function VotarPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState("");
  const [kpi, setKpi] = useState<string>(KPIS[0]);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!nome.trim()) errors.nome = "Informe seu nome.";
    if (!email.trim()) errors.email = "Informe seu email.";
    else if (!EMAIL_REGEX.test(email.trim()))
      errors.email = "Informe um email válido.";
    if (!setor.trim()) errors.setor = "Informe seu setor.";

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatus("error");
      setErrorMessage("Corrija os campos destacados antes de enviar.");
      return;
    }

    if (nota === null) {
      setStatus("error");
      setErrorMessage("Selecione uma nota de 0 a 10.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.from("respostas_nps").insert({
      nome: nome.trim(),
      email: email.trim(),
      setor: setor.trim(),
      kpi,
      nota,
      comentario: comentario.trim() ? comentario.trim() : null,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("success");
    setNome("");
    setEmail("");
    setSetor("");
    setKpi(KPIS[0]);
    setNota(null);
    setComentario("");
    setFieldErrors({});
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-lg p-8">
        <BrandHeader
          title="Avalie a sua Experiência com o Suporte de T.I"
          subtitle="Sua opinião nos ajuda a melhorar."
        />

        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label
              htmlFor="nome"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nome Completo
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={status === "loading"}
              placeholder="Seu nome"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
            {fieldErrors.nome && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.nome}
              </p>
            )}
          </div>

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
            {fieldErrors.email && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="setor"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Setor
            </label>
            <select
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              disabled={status === "loading"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            >
              <option value="" disabled>
                Selecione o Setor
              </option>
              {SETORES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {fieldErrors.setor && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.setor}
              </p>
            )}
          </div>
          {/*
          <div>
            <label
              htmlFor="kpi"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
            
              Indicador
            </label>
            <select
              id="kpi"
              value={kpi}
              onChange={(e) => setKpi(e.target.value)}
              disabled={status === "loading"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {KPIS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          */}

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Nota (0 a 10)
            </span>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {NOTAS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={status === "loading"}
                  onClick={() => setNota(n)}
                  style={
                    nota === n
                      ? { backgroundColor: "#084897", borderColor: "#084897", color: "#ffffff" }
                      : { backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#334155" }
                  }
                  className="flex h-10 w-full items-center justify-center rounded-lg border text-sm font-medium transition-colors hover:border-secondary"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="comentario"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Comentário (Opcional)
            </label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              disabled={status === "loading"}
              rows={3}
              placeholder="Conte um pouco mais sobre sua nota..."
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          {status === "success" && (
            <p className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm font-medium text-secondary">
              Voto registrado, obrigado!
            </p>
          )}

          {status === "error" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage || "Ocorreu um erro ao registrar seu voto."}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "loading"}
            style={{ backgroundColor: "#084897", color: "#ffffff" }}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Enviando..." : "Enviar Voto"}
          </button>
        </div>
      </div>
    </div>
  );
}
