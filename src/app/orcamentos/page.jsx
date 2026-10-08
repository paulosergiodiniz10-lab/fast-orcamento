"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Search, ArrowLeft, MessageCircle, ExternalLink, 
  Loader2, Calendar, Users, Building2, Trash2, RefreshCw 
} from "lucide-react";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "firebase/firestore";

export default function GestaoOrcamentos() {
  const [agencia, setAgencia] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [buscaGeral, setBuscaGeral] = useState("");
  const [filtroCheckin, setFiltroCheckin] = useState("");

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("fast_agencia");
    if (!dadosSalvos) {
      window.location.href = "/login";
      return;
    }
    const ag = JSON.parse(dadosSalvos);
    setAgencia(ag);
    carregarOrcamentos(ag.id);
  }, []);

  const carregarOrcamentos = async (agenciaId) => {
    try {
      setCarregando(true);
      const q = query(
        collection(db, "orcamentos"),
        where("agenciaId", "==", agenciaId)
      );
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach((d) => {
        lista.push({ id: d.id, ...d.data() });
      });

      // Ordena por data de criação mais recente
      lista.sort((a, b) => {
        const tA = a.criadoEm?.seconds || 0;
        const tB = b.criadoEm?.seconds || 0;
        return tB - tA;
      });

      setOrcamentos(lista);
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    } finally {
      setCarregando(false);
    }
  };

  const excluirOrcamento = async (id) => {
    if (!confirm("Deseja realmente excluir este orçamento salvo?")) return;
    try {
      await deleteDoc(doc(db, "orcamentos", id));
      setOrcamentos((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir orçamento.");
    }
  };

  // Filtragem dos orçamentos
  const orcamentosFiltrados = orcamentos.filter((o) => {
    const termo = buscaGeral.toLowerCase();
    const idCurto = o.id.slice(0, 6).toLowerCase();
    const nomeCliente = (o.clienteNome || "").toLowerCase();
    const nomeHotel = (o.hotel?.nome || "").toLowerCase();
    const zapCliente = (o.clienteWhatsapp || "").toLowerCase();

    const bateGeral =
      termo === "" ||
      idCurto.includes(termo) ||
      nomeCliente.includes(termo) ||
      nomeHotel.includes(termo) ||
      zapCliente.includes(termo);

    const bateCheckin =
      filtroCheckin === "" || (o.checkin && o.checkin === filtroCheckin);

    return bateGeral && bateCheckin;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* CABEÇALHO */}
      <header className="bg-brand-900 text-white px-4 md:px-8 py-4 shadow sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-brand-800 hover:bg-brand-700 transition text-white"
            title="Voltar ao Gerador"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight">Histórico de Cotações Geradas</h1>
            <p className="text-xs text-brand-100">{agencia?.nome || "Painel da Agência"}</p>
          </div>
        </div>

        <button
          onClick={() => agencia && carregarOrcamentos(agencia.id)}
          className="p-2 bg-brand-800 hover:bg-brand-700 rounded-lg text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-2 space-y-4">
        {/* BARRA DE PESQUISA E FILTROS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por ID, Nome do Cliente, Hotel ou Telefone..."
              value={buscaGeral}
              onChange={(e) => setBuscaGeral(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
            />
          </div>

          <div>
            <input
              type="date"
              title="Filtrar por data de check-in"
              value={filtroCheckin}
              onChange={(e) => setFiltroCheckin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
            />
          </div>
        </div>

        {/* LISTAGEM DOS ORÇAMENTOS */}
        {carregando ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-brand-900 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Carregando histórico de orçamentos...</p>
          </div>
        ) : orcamentosFiltrados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Nenhum orçamento encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
              Gere novas cotações na tela principal e todas ficarão salvas automaticamente aqui.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
            >
              Criar Nova Cotação
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
              <span>Mostrando {orcamentosFiltrados.length} cotação(ões)</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {orcamentosFiltrados.map((orc) => {
                const idCurto = orc.id.slice(0, 6).toUpperCase();
                const zapTratado = (orc.clienteWhatsapp || "").replace(/\D/g, "");
                const linkZapCliente = zapTratado
                  ? `https://wa.me/${zapTratado.startsWith("55") ? zapTratado : `55${zapTratado}`}?text=${encodeURIComponent(
                      `Olá, ${orc.clienteNome || "tudo bem"}! Segue o link com as fotos e detalhes do seu orçamento no ${orc.hotel?.nome}: ${window.location.origin}/o/${orc.id}`
                    )}`
                  : null;

                const urlVitrine = `/o/${orc.id}`;

                return (
                  <div
                    key={orc.id}
                    className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Dados Básicos */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                          ID: #{idCurto}
                        </span>
                        <h3 className="font-extrabold text-sm md:text-base text-slate-900">
                          {orc.hotel?.nome}
                        </h3>
                        {orc.acomodacaoEscolhida && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {orc.acomodacaoEscolhida}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <strong className="text-slate-800 block text-[11px]">Cliente:</strong>
                          <span>{orc.clienteNome || "Não informado"}</span>
                        </div>

                        <div>
                          <strong className="text-slate-800 block text-[11px]">Período:</strong>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-brand-700" />
                            {orc.periodoFormatado}
                          </span>
                        </div>

                        <div>
                          <strong className="text-slate-800 block text-[11px]">Hóspedes:</strong>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-brand-700" />
                            {orc.hospedes}
                          </span>
                        </div>
                      </div>

                      {/* Valores Cotados */}
                      {orc.regimes && orc.regimes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 mt-2">
                          {orc.regimes.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              className="text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium"
                            >
                              <strong>{r.nome}:</strong> R$ {r.valor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 shrink-0 justify-end">
                      {linkZapCliente && (
                        <a
                          href={linkZapCliente}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow"
                          title="Chamar cliente no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <Link
                        href={urlVitrine}
                        target="_blank"
                        className="flex items-center gap-1 text-slate-700 hover:text-brand-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition"
                        title="Abrir Vitrine"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vitrine</span>
                      </Link>

                      <button
                        onClick={() => excluirOrcamento(orc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                        title="Excluir cotação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
