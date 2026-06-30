"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";
import { BrandHeader } from "@/components/BrandHeader";

type RespostaNps = {
  id: string;
  nome: string;
  email: string;
  setor: string;
  kpi: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
};

type Status = "loading" | "success" | "error";

type AuthStatus = "checking" | "authenticated";

const CORES = {
  promotores: "#009b67",
  neutros: "#eab308",
  detratores: "#ef4444",
};

function classificar(nota: number): "promotores" | "neutros" | "detratores" {
  if (nota >= 9) return "promotores";
  if (nota >= 7) return "neutros";
  return "detratores";
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

function sufixoArquivoData(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const COLUNAS_EXPORTACAO = [
  "Nome",
  "Email",
  "Setor",
  "KPI",
  "Nota",
  "Comentário",
  "Data",
];

function linhasExportacao(respostas: RespostaNps[]): (string | number)[][] {
  return respostas.map((r) => [
    r.nome,
    r.email,
    r.setor,
    r.kpi,
    r.nota,
    r.comentario ?? "",
    formatarDataHora(r.criado_em),
  ]);
}

const LOGO_SRC = "/LOGO-PRODUTECNICA-COR-HORIZONTAL.png";
const LOGO_ASPECT_RATIO = 3626 / 1418;

async function carregarImagemDataUrl(src: string): Promise<string> {
  const resposta = await fetch(src);
  const blob = await resposta.blob();

  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onloadend = () => resolve(leitor.result as string);
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [respostas, setRespostas] = useState<RespostaNps[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setAuthStatus("authenticated");
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fetchRespostas = async () => {
      setStatus("loading");
      const { data, error } = await supabase
        .from("respostas_nps")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }

      setRespostas(data ?? []);
      setStatus("success");
    };

    fetchRespostas();
  }, [authStatus]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleExportarExcel = () => {
    if (respostas.length === 0) return;

    const planilha = XLSX.utils.aoa_to_sheet([
      COLUNAS_EXPORTACAO,
      ...linhasExportacao(respostas),
    ]);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Respostas");
    XLSX.writeFile(livro, `relatorio-nps-${sufixoArquivoData()}.xlsx`);
  };

  const handleExportarPdf = async () => {
    if (respostas.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const larguraPagina = doc.internal.pageSize.getWidth();

    const larguraLogo = 50;
    const alturaLogo = larguraLogo / LOGO_ASPECT_RATIO;
    const logoX = (larguraPagina - larguraLogo) / 2;
    const logoY = 10;

    try {
      const logoDataUrl = await carregarImagemDataUrl(LOGO_SRC);
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, larguraLogo, alturaLogo);
    } catch {
      // segue a exportação sem a logo caso não seja possível carregá-la
    }

    const tituloY = logoY + alturaLogo + 8;
    doc.setFontSize(16);
    doc.text("Relatório de NPS - Produtécnica Agro", larguraPagina / 2, tituloY, {
      align: "center",
    });

    const dataY = tituloY + 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Gerado em: ${formatarDataHora(new Date().toISOString())}`,
      larguraPagina / 2,
      dataY,
      { align: "center" }
    );

    autoTable(doc, {
      startY: dataY + 6,
      head: [COLUNAS_EXPORTACAO],
      body: linhasExportacao(respostas),
      headStyles: { fillColor: [8, 72, 151] },
      styles: { fontSize: 8 },
    });

    doc.save(`relatorio-nps-${sufixoArquivoData()}.pdf`);
  };

  const stats = useMemo(() => {
    const total = respostas.length;
    let promotores = 0;
    let neutros = 0;
    let detratores = 0;

    for (const resposta of respostas) {
      const grupo = classificar(resposta.nota);
      if (grupo === "promotores") promotores++;
      else if (grupo === "neutros") neutros++;
      else detratores++;
    }

    const nps =
      total > 0
        ? Math.round(((promotores - detratores) / total) * 100)
        : 0;

    return { total, promotores, neutros, detratores, nps };
  }, [respostas]);

  const dadosPorKpi = useMemo(() => {
    const grupos = new Map<string, { soma: number; quantidade: number }>();

    for (const resposta of respostas) {
      const atual = grupos.get(resposta.kpi) ?? { soma: 0, quantidade: 0 };
      atual.soma += resposta.nota;
      atual.quantidade += 1;
      grupos.set(resposta.kpi, atual);
    }

    return Array.from(grupos.entries()).map(([kpi, { soma, quantidade }]) => ({
      kpi,
      notaMedia: Number((soma / quantidade).toFixed(1)),
    }));
  }, [respostas]);

  const dadosPorSetor = useMemo(() => {
    const grupos = new Map<string, { soma: number; quantidade: number }>();

    for (const resposta of respostas) {
      const atual = grupos.get(resposta.setor) ?? { soma: 0, quantidade: 0 };
      atual.soma += resposta.nota;
      atual.quantidade += 1;
      grupos.set(resposta.setor, atual);
    }

    return Array.from(grupos.entries()).map(
      ([setor, { soma, quantidade }]) => ({
        setor,
        quantidade,
        notaMedia: Number((soma / quantidade).toFixed(1)),
      })
    );
  }, [respostas]);

  const dadosPizza = useMemo(
    () => [
      { name: "Positivos", value: stats.promotores, cor: CORES.promotores },
      { name: "Neutros", value: stats.neutros, cor: CORES.neutros },
      { name: "Negativos", value: stats.detratores, cor: CORES.detratores },
    ],
    [stats]
  );

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando autenticação...</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Carregando dados...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Erro ao carregar dados: {errorMessage}
        </p>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Ainda não há respostas registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 bg-slate-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-secondary hover:text-secondary"
          >
            Sair
          </button>
        </div>

        <BrandHeader
          title="Dashboard de NPS"
          subtitle="Visão geral das respostas coletadas."
        />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card titulo="Total de respostas" valor={stats.total} />
          <Card titulo="NPS geral" valor={stats.nps} cor="text-primary" />
          <Card titulo="Promotores" valor={stats.promotores} cor="text-secondary" />
          <Card titulo="Neutros" valor={stats.neutros} cor="text-yellow-600" />
          <Card titulo="Detratores" valor={stats.detratores} cor="text-red-600" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Nota Média NPS
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosPorKpi}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis
                  dataKey="kpi"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="notaMedia" fill="#084897" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Positivos x Neutros x Negativos
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {dadosPizza.map((entrada) => (
                    <Cell key={entrada.name} fill={entrada.cor} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Respostas por setor
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosPorSetor}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis
                  dataKey="setor"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#009b67" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Respostas Individuais
            </h2>
            <div className="flex items-center gap-2">
              {respostas.length === 0 && (
                <span className="text-xs text-slate-500">
                  Não há dados para exportar.
                </span>
              )}
              <button
                type="button"
                onClick={handleExportarPdf}
                disabled={respostas.length === 0}
                style={{ backgroundColor: "#084897", color: "#ffffff" }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={handleExportarExcel}
                disabled={respostas.length === 0}
                style={{ backgroundColor: "#009b67", color: "#ffffff" }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Setor</th>
                  <th className="py-2 pr-4">KPI</th>
                  <th className="py-2 pr-4">Nota</th>
                  <th className="py-2 pr-4">Comentário</th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((resposta) => (
                  <tr
                    key={resposta.id}
                    className="border-b border-slate-100 text-slate-700 last:border-0"
                  >
                    <td className="py-2 pr-4">{resposta.nome}</td>
                    <td className="py-2 pr-4">{resposta.email}</td>
                    <td className="py-2 pr-4">{resposta.setor}</td>
                    <td className="py-2 pr-4">{resposta.kpi}</td>
                    <td className="py-2 pr-4">{resposta.nota}</td>
                    <td className="py-2 pr-4">{resposta.comentario ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  cor,
}: {
  titulo: string;
  valor: number;
  cor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold text-slate-900 ${cor ?? ""}`}>
        {valor}
      </p>
    </div>
  );
}
