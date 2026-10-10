"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Search, ArrowLeft, MessageCircle, ExternalLink, 
  Loader2, Calendar, Users, Trash2, RefreshCw, X, PlusCircle, 
  Clock, ChevronLeft, ChevronRight, HelpCircle, AlertCircle,
  Copy, Check, Phone
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const ITENS_POR_PAGINA = 50;

export default function GestaoOrcamentos() {
  const router = useRouter();
  const [agencia, setAgencia] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de cópia rápida do telefone
  const [copiadoId, setCopiadoId] = useState(null);

  // Filtros
  const [buscaGeral, setBuscaGeral] = useState("");
  const [filtroCheckin, setFiltroCheckin] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos"); // 'todos', 'hoje', 'ontem', '7dias', 'personalizado'
  const [dataPersonalizada, setDataPersonalizada] = useState("");

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Modal Customizado
  const [modalConfig, setModalConfig] = useState({
    aberto: false,
    tipo: "confirm", // 'confirm' ou 'alert'
    titulo: "",
    mensagem: "",
    onConfirm: null,
  });

  const abrirConfirmacao = (titulo, mensagem, onConfirm) => {
    setModalConfig({
      aberto: true,
      tipo: "confirm",
      titulo,
      mensagem,
      onConfirm,
    });
  };

  const abrirAlerta = (titulo, mensagem) => {
    setModalConfig({
      aberto: true,
      tipo: "alert",
      titulo,
      mensagem,
      onConfirm,
    });
  };

  const fecharModal = () => {
    setModalConfig((prev) => ({ ...prev, aberto: false }));
  };

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

  const limparFiltros = () => {
    setBuscaGeral("");
    setFiltroCheckin("");
    setFiltroPeriodo("todos");
    setDataPersonalizada("");
    setPaginaAtual(1);
  };

  const executarExclusao = async (id) => {
    try {
      await deleteDoc(doc(db, "orcamentos", id));
      setOrcamentos((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error(err);
      abrirAlerta("Erro ao Excluir", "Não foi possível excluir este orçamento.");
    }
  };

  const excluirOrcamento = (id) => {
    abrirConfirmacao(
      "Excluir Orçamento",
      "Deseja realmente excluir este orçamento salvo? Esta ação não poderá ser desfeita.",
      () => executarExclusao(id)
    );
  };

  const criarNovaCotacaoComDados = (orc) => {
    const params = new URLSearchParams();
    if (orc.clienteNome) params.set("clienteNome", orc.clienteNome);
    if (orc.clienteWhatsapp) params.set("clienteWhatsapp", orc.clienteWhatsapp);
    if (orc.adultos) params.set("adultos", orc.adultos);
    if (orc.criancas) params.set("criancas", orc.criancas);
    if (orc.idadesCriancas) params.set("idadesCriancas", orc.idadesCriancas);
    if (orc.hotel?.nome) params.set("hotelNome", orc.hotel.nome);
    if (orc.tipoOrcamento) params.set("tipoOrcamento", orc.tipoOrcamento);
    router.push(`/?${params.toString()}`);
  };

  const formatarDataHoraCriacao = (timestamp) => {
    if (!timestamp?.seconds) return "Data não registrada";
    const data = new Date(timestamp.seconds * 1000);
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, "0");
    const min = String(data.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  };

  // Formata o número visualmente: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const formatarNumeroTelefone = (tel) => {
    if (!tel) return "";
    const num = tel.replace(/\D/g, "");
    if (num.length === 11) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
    }
    if (num.length === 10) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
    }
    return tel;
  };

  const copiarTelefone = (tel, id) => {
    const limpo = (tel || "").replace(/\D/g, "");
    if (!limpo) return;
    navigator.clipboard.writeText(limpo);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
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

    let bateDataCriacao = true;
    if (filtroPeriodo !== "todos" && o.criadoEm?.seconds) {
      const dataCriacao = new Date(o.criadoEm.seconds * 1000);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataCriacaoZerada = new Date(dataCriacao);
      dataCriacaoZerada.setHours(0, 0, 0, 0);

      if (filtroPeriodo === "hoje") {
        bateDataCriacao = dataCriacaoZerada.getTime() === hoje.getTime();
      } else if (filtroPeriodo === "ontem") {
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        bateDataCriacao = dataCriacaoZerada.getTime() === ontem.getTime();
      } else if (filtroPeriodo === "7dias") {
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        bateDataCriacao = dataCriacaoZerada.getTime() >= seteDiasAtras.getTime();
      } else if (filtroPeriodo === "personalizado" && dataPersonalizada) {
        const [ano, mes, dia] = dataPersonalizada.split("-").map(Number);
        const dataAlvo = new Date(ano, mes - 1, dia);
        dataAlvo.setHours(0, 0, 0, 0);
        bateDataCriacao = dataCriacaoZerada.getTime() === dataAlvo.getTime();
      }
    }

    return bateGeral && bateCheckin && bateDataCriacao;
  });

  const totalPaginas = Math.ceil(orcamentosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const indexInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const orcamentosPaginados = orcamentosFiltrados.slice(indexInicial, indexInicial + ITENS_POR_PAGINA);

  const irParaPaginaAnterior = () => {
    if (paginaAtual > 1) {
      setPaginaAtual((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const irParaProximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans relative">
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
        {/* BARRA DE PESQUISA, FILTROS E DATAS */}
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Pesquisar
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por ID, Nome do Cliente, Hotel ou Telefone..."
                  value={buscaGeral}
                  onChange={(e) => {
                    setBuscaGeral(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Check-in
              </label>
              <input
                type="date"
                title="Filtrar por data de check-in"
                value={filtroCheckin}
                onChange={(e) => {
                  setFiltroCheckin(e.target.value);
                  setPaginaAtual(1);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={limparFiltros}
                disabled={!buscaGeral && !filtroCheckin && filtroPeriodo === "todos" && !dataPersonalizada}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Limpar todos os filtros"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* FILTROS RÁPIDOS DE DATA DE CRIAÇÃO DO ORÇAMENTO */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Criado em:
              </span>

              {[
                { id: "todos", label: "Todos" },
                { id: "hoje", label: "Hoje" },
                { id: "ontem", label: "Ontem" },
                { id: "7dias", label: "Últimos 7 dias" },
                { id: "personalizado", label: "Personalizado" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => {
                    setFiltroPeriodo(btn.id);
                    setPaginaAtual(1);
                  }}
                  className={`text-xs px-3 py-1 rounded-lg border font-semibold transition ${
                    filtroPeriodo === btn.id
                      ? "bg-brand-900 text-white border-brand-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {btn.label}
                </button>
              ))}

              {filtroPeriodo === "personalizado" && (
                <input
                  type="date"
                  value={dataPersonalizada}
                  onChange={(e) => {
                    setDataPersonalizada(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-brand-900 ml-1"
                />
              )}
            </div>

            {/* CONTADORES */}
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{orcamentosFiltrados.length}</strong> cotação(ões) • Total Geral: <strong className="text-slate-800">{orcamentos.length}</strong>
            </div>
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
              Tente alterar os termos da busca ou limpe os filtros.
            </p>
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
            >
              Mostrar Todos os Orçamentos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {orcamentosPaginados.map((orc) => {
                const idCurto = orc.id.slice(0, 6).toUpperCase();
                const zapTratado = (orc.clienteWhatsapp || "").replace(/\D/g, "");
                const isGrupo = orc.tipoOrcamento === "grupos" || (orc.apartamentosGrupo && orc.apartamentosGrupo.length > 0);
                
                // Link de WhatsApp direto SEM mensagem prévia
                const linkZapDiretoSemMensagem = zapTratado
                  ? `https://wa.me/${zapTratado.startsWith("55") ? zapTratado : `55${zapTratado}`}`
                  : null;

                // Mensagem de Remarketing para o botão da direita
                const saudacao = orc.clienteNome ? `Olá, ${orc.clienteNome}!` : "Olá!";
                const textoRemarketing = encodeURIComponent(
                  `${saudacao} Vi que fez um *orçamento* conosco recentemente. *Ficou alguma dúvida?*\n\nTemos ofertas especiais e *pagamento facilitado*.\n\nQuer que eu prepare uma nova proposta para você?`
                );

                const linkZapCliente = zapTratado
                  ? `https://wa.me/${zapTratado.startsWith("55") ? zapTratado : `55${zapTratado}`}?text=${textoRemarketing}`
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

                        {isGrupo ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Grupo ({orc.apartamentosGrupo?.length || 0} aptos)
                          </span>
                        ) : orc.acomodacaoEscolhida && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {orc.acomodacaoEscolhida}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-normal ml-auto sm:ml-0">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatarDataHoraCriacao(orc.criadoEm)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        {/* Cliente + Telefone + Botão Zap Rápido + Botão Copiar */}
                        <div>
                          <strong className="text-slate-800 block text-[11px]">Cliente:</strong>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-800">
                              {orc.clienteNome || "Não informado"}
                            </span>

                            {zapTratado && (
                              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[11px] text-slate-700 font-mono">
                                <span>{formatarNumeroTelefone(orc.clienteWhatsapp)}</span>

                                {/* Ícone do WhatsApp para acesso rápido sem texto */}
                                <a
                                  href={linkZapDiretoSemMensagem}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded transition hover:bg-emerald-50"
                                  title="Abrir WhatsApp direto (conversa limpa sem texto)"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>

                                {/* Ícone para Copiar o número */}
                                <button
                                  type="button"
                                  onClick={() => copiarTelefone(orc.clienteWhatsapp, orc.id)}
                                  className="text-slate-500 hover:text-slate-800 p-0.5 rounded transition hover:bg-slate-200"
                                  title="Copiar número de telefone"
                                >
                                  {copiadoId === orc.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <strong className="text-slate-800 block text-[11px]">Período:</strong>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-brand-700" />
                            {orc.periodoFormatado}
                          </span>
                        </div>

                        <div>
                          <strong className="text-slate-800 block text-[11px]">
                            {isGrupo ? "Estrutura:" : "Hóspedes:"}
                          </strong>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-brand-700" />
                            {orc.hospedes}
                          </span>
                        </div>
                      </div>

                      {/* Valores Cotados */}
                      {!isGrupo && orc.regimes && orc.regimes.length > 0 && (
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
                      <button
                        type="button"
                        onClick={() => criarNovaCotacaoComDados(orc)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow active:scale-95"
                        title="Fazer novo orçamento pré-carregando os dados deste cliente"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Novo</span>
                      </button>

                      {linkZapCliente && (
                        <a
                          href={linkZapCliente}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow active:scale-95"
                          title="Enviar mensagem de remarketing"
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

            {/* CONTROLES DE PAGINAÇÃO (MÁXIMO 50 POR PÁGINA) */}
            {totalPaginas > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-semibold text-slate-600 mt-4">
                <span>
                  Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (Exibindo até 50 por página)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={irParaPaginaAnterior}
                    disabled={paginaAtual === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={irParaProximaPagina}
                    disabled={paginaAtual === totalPaginas}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= MODAL ESTILIZADO DE CONFIRMAÇÃO / ALERTA ================= */}
      {modalConfig.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                modalConfig.tipo === "confirm" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
              }`}>
                {modalConfig.tipo === "confirm" ? (
                  <HelpCircle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {modalConfig.titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Fast Orçamento</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {modalConfig.mensagem}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {modalConfig.tipo === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      fecharModal();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow"
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-900 hover:bg-brand-950 transition shadow"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
