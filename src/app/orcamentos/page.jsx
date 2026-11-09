"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Search, ArrowLeft, MessageCircle, ExternalLink, 
  Loader2, Calendar, Users, Trash2, RefreshCw, X, PlusCircle, 
  Clock, ChevronLeft, ChevronRight, HelpCircle, AlertCircle,
  Copy, Check, Phone, UserCheck, DollarSign, CheckCircle2,
  TrendingUp, Undo2, Settings, Send, Instagram
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";

const ITENS_POR_PAGINA = 50;

// Modelos padrão de fábrica
const MODELOS_FOLLOWUP_PADRAO = {
  f1: "Olá, {cliente}! Tudo bem? Passando para saber se conseguiu dar uma olhada na proposta que te enviei do *{hotel}* para o período de *{datas}*.\n\nLembrando que os parques já estão inclusos e as vagas com essa tarifa estão acabando! Ficou com alguma dúvida?",
  f2: "Oi, {cliente}! Tudo bem por aí? Passando rapidinho: você ainda tem planos de vir curtir Caldas Novas nas próximas semanas?\n\nSurgiram algumas condições especiais e novas tarifas promocionais por aqui. Se quiser, me avisa que vejo as melhores opções para você!",
  f3: "{cliente}, muito obrigado pela atenção e pelo contato!\n\nCaso não dê certo viajar agora, sem problemas: estamos sempre à disposição por aqui quando decidir vir.\n\nAcompanhe nosso perfil no Instagram para ficar por dentro dos parques e promoções exclusivas: {instagram}\n\nUm abraço e até a próxima!",
};

export default function GestaoOrcamentos() {
  const router = useRouter();
  const [agencia, setAgencia] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de cópia rápida do telefone
  const [copiadoId, setCopiadoId] = useState(null);

  // Modelos de follow-up e Instagram da agência
  const [configFollowUp, setConfigFollowUp] = useState({
    instagram: "@caldasnovasviagem",
    f1: MODELOS_FOLLOWUP_PADRAO.f1,
    f2: MODELOS_FOLLOWUP_PADRAO.f2,
    f3: MODELOS_FOLLOWUP_PADRAO.f3,
  });
  const [modalConfigFollowUpAberto, setModalConfigFollowUpAberto] = useState(false);
  const [salvandoConfigFollowUp, setSalvandoConfigFollowUp] = useState(false);

  // Filtros
  const [buscaGeral, setBuscaGeral] = useState("");
  const [filtroCheckin, setFiltroCheckin] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState("");
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState("todos");
  const [filtroStatusVenda, setFiltroStatusVenda] = useState("todos");

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Modal Fechamento de Venda
  const [modalVendaConfig, setModalVendaConfig] = useState({
    aberto: false,
    orcamento: null,
    regimeSelecionado: "",
    valorFechado: "",
  });

  // Modal Customizado Alerta/Confirmação
  const [modalConfig, setModalConfig] = useState({
    aberto: false,
    tipo: "confirm",
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
      onConfirm: null,
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
    carregarDados(ag.id);
    carregarConfigAgencia(ag.id);
  }, []);

  const carregarConfigAgencia = async (agenciaId) => {
    if (!agenciaId) return;
    try {
      const docRef = doc(db, "agencias", agenciaId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setConfigFollowUp({
          instagram: d.instagram || "@caldasnovasviagem",
          f1: d.followUpModelos?.f1 || MODELOS_FOLLOWUP_PADRAO.f1,
          f2: d.followUpModelos?.f2 || MODELOS_FOLLOWUP_PADRAO.f2,
          f3: d.followUpModelos?.f3 || MODELOS_FOLLOWUP_PADRAO.f3,
        });
      }
    } catch (err) {
      console.warn("Configurações da agência não puderam ser carregadas:", err);
    }
  };

  const salvarConfiguracoesAgencia = async (e) => {
    e.preventDefault();
    if (!agencia?.id) return;
    setSalvandoConfigFollowUp(true);
    try {
      const docRef = doc(db, "agencias", agencia.id);
      await setDoc(
        docRef,
        {
          instagram: configFollowUp.instagram.trim(),
          followUpModelos: {
            f1: configFollowUp.f1,
            f2: configFollowUp.f2,
            f3: configFollowUp.f3,
          },
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );
      setModalConfigFollowUpAberto(false);
      abrirAlerta("Configurações Salvas", "Os modelos de follow-up e Instagram foram atualizados com sucesso!");
    } catch (err) {
      console.error(err);
      abrirAlerta("Erro", "Não foi possível gravar as configurações.");
    } finally {
      setSalvandoConfigFollowUp(false);
    }
  };

  const carregarDados = async (agenciaId) => {
    try {
      setCarregando(true);

      const qOrc = query(
        collection(db, "orcamentos"),
        where("agenciaId", "==", agenciaId)
      );
      const snapOrc = await getDocs(qOrc);
      const listaOrc = [];
      snapOrc.forEach((d) => {
        listaOrc.push({ id: d.id, ...d.data() });
      });

      listaOrc.sort((a, b) => {
        const tA = a.criadoEm?.seconds || 0;
        const tB = b.criadoEm?.seconds || 0;
        return tB - tA;
      });
      setOrcamentos(listaOrc);

      try {
        const colabRef = collection(db, "agencias", agenciaId, "usuarios");
        const snapColab = await getDocs(colabRef);
        const listaColab = [];
        snapColab.forEach((d) => {
          const dados = d.data();
          if (dados.nome) {
            listaColab.push({
              id: d.id,
              nome: dados.nome,
              login: dados.login || "",
            });
          }
        });

        listaOrc.forEach((item) => {
          const autor = item.criadoPor?.nome;
          if (autor && !listaColab.some((c) => c.nome.toLowerCase() === autor.toLowerCase())) {
            listaColab.push({
              id: autor,
              nome: autor,
              login: item.criadoPor?.login || autor,
            });
          }
        });

        setColaboradores(listaColab);
      } catch (errColab) {
        console.warn("Colaboradores não carregados:", errColab);
      }
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
    setDataInicioPersonalizada("");
    setDataFimPersonalizada("");
    setFiltroColaborador("todos");
    setFiltroStatusVenda("todos");
    setPaginaAtual(1);
  };

  const executarExclusao = async (id) => {
    try {
      await deleteDoc(doc(db, "orcamentos", id));
      setOrcamentos((prev) => prev.filter((o) => o.id !== id));
      abrirAlerta("Sucesso", "Orçamento excluído com sucesso.");
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

  // Disparo e Registro do Follow-up 1, 2 ou 3
  const dispararFollowUp = async (orc, numero) => {
    const zapTratado = (orc.clienteWhatsapp || "").replace(/\D/g, "");
    if (!zapTratado || zapTratado.length < 10) {
      abrirAlerta("WhatsApp Não Informado", "Esta cotação não possui número de WhatsApp válido gravado.");
      return;
    }

    const template = configFollowUp[`f${numero}`] || MODELOS_FOLLOWUP_PADRAO[`f${numero}`];
    const primeiroNome = orc.clienteNome ? orc.clienteNome.trim().split(" ")[0] : "Cliente";
    const hotelNome = orc.hotel?.nome || "Caldas Novas";
    const periodo = orc.periodoFormatado || `${orc.checkin || ""} a ${orc.checkout || ""}`;
    const insta = configFollowUp.instagram || "@caldasnovasviagem";
    const linkVitrine = `${typeof window !== "undefined" ? window.location.origin : ""}/o/${orc.id}`;

    // Substituição das tags dinâmicas
    const mensagemFinal = template
      .replace(/\{cliente\}|\{NOME\}/gi, primeiroNome)
      .replace(/\{hotel\}/gi, hotelNome)
      .replace(/\{datas\}|\{CHECKIN\}\s*a\s*\{CHECKOUT\}/gi, periodo)
      .replace(/\{instagram\}/gi, insta)
      .replace(/\{link\}/gi, linkVitrine);

    // Abre WhatsApp Web / App
    const numeroFormatado = zapTratado.startsWith("55") ? zapTratado : `55${zapTratado}`;
    const urlZap = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagemFinal)}`;
    window.open(urlZap, "_blank");

    // Grava no Firestore e atualiza o estado local
    try {
      const docRef = doc(db, "orcamentos", orc.id);
      const updates = {
        ultimoFollowUp: numero,
        [`followUp${numero}Enviado`]: true,
        [`followUp${numero}Em`]: serverTimestamp(),
      };
      await updateDoc(docRef, updates);

      const agoraSimulado = { seconds: Math.floor(Date.now() / 1000) };
      setOrcamentos((prev) =>
        prev.map((o) =>
          o.id === orc.id
            ? {
                ...o,
                ultimoFollowUp: numero,
                [`followUp${numero}Enviado`]: true,
                [`followUp${numero}Em`]: agoraSimulado,
              }
            : o
        )
      );
    } catch (err) {
      console.warn("Erro ao registrar status do follow-up:", err);
    }
  };

  // Gestão de Venda Fechada
  const abrirModalFechamentoVenda = (orc) => {
    const regimesDisponiveis = orc.regimes || [];
    const primeiroRegime = regimesDisponiveis[0] || {};
    
    setModalVendaConfig({
      aberto: true,
      orcamento: orc,
      regimeSelecionado: primeiroRegime.nome || "Café da Manhã",
      valorFechado: primeiroRegime.valor || "",
    });
  };

  const salvarFechamentoVenda = async () => {
    const { orcamento, regimeSelecionado, valorFechado } = modalVendaConfig;
    if (!orcamento?.id) return;

    try {
      const docRef = doc(db, "orcamentos", orcamento.id);
      const dadosAtualizados = {
        vendaFechada: true,
        fechamento: {
          regimeNome: regimeSelecionado,
          valorFechado: valorFechado,
          fechadoEm: serverTimestamp(),
          fechadoPor: agencia?.nomeUsuario || agencia?.nome || "Gestor",
        },
      };

      await updateDoc(docRef, dadosAtualizados);

      setOrcamentos((prev) =>
        prev.map((o) =>
          o.id === orcamento.id ? { ...o, ...dadosAtualizados } : o
        )
      );

      setModalVendaConfig({ aberto: false, orcamento: null, regimeSelecionado: "", valorFechado: "" });
      abrirAlerta("Parabéns!", "Venda marcada como fechada com sucesso!");
    } catch (err) {
      console.error("Erro ao registrar venda fechada:", err);
      abrirAlerta("Erro", "Não foi possível registrar o fechamento desta venda.");
    }
  };

  const reabrirCotacao = (orc) => {
    abrirConfirmacao(
      "Reabrir Cotação",
      "Deseja remover o status de venda fechada desta cotação?",
      async () => {
        try {
          const docRef = doc(db, "orcamentos", orc.id);
          await updateDoc(docRef, {
            vendaFechada: false,
            fechamento: null,
          });

          setOrcamentos((prev) =>
            prev.map((o) =>
              o.id === orc.id ? { ...o, vendaFechada: false, fechamento: null } : o
            )
          );
        } catch (err) {
          console.error(err);
          abrirAlerta("Erro", "Não foi possível reabrir esta cotação.");
        }
      }
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

  const formatarHospedesLimpo = (orc) => {
    if (!orc) return "";
    const isGrupo = orc.tipoOrcamento === "grupos" || (orc.apartamentosGrupo && orc.apartamentosGrupo.length > 0);
    if (isGrupo) {
      return orc.hospedes || `Grupo (${orc.apartamentosGrupo?.length || 0} aptos)`;
    }

    if (orc.adultos !== undefined) {
      const ad = parseInt(orc.adultos, 10) || 0;
      const cr = parseInt(orc.criancas, 10) || 0;
      return cr > 0 ? `${ad} Adulto(s) e ${cr} Criança(s)` : `${ad} Adulto(s)`;
    }

    if (orc.hospedes) {
      return orc.hospedes.replace(/\s*\((?![sS]\)).*$/, "").trim();
    }

    return "Não informado";
  };

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

  const ehGestor = !agencia?.permissao || agencia.permissao === "gestor";

  // Filtragem dos orçamentos
  const orcamentosFiltrados = orcamentos.filter((o) => {
    const termo = buscaGeral.toLowerCase();
    const idCurto = o.id.slice(0, 6).toLowerCase();
    const nomeCliente = (o.clienteNome || "").toLowerCase();
    const nomeHotel = (o.hotel?.nome || "").toLowerCase();
    const zapCliente = (o.clienteWhatsapp || "").toLowerCase();
    const autorNome = (o.criadoPor?.nome || "").toLowerCase();
    const autorLogin = (o.criadoPor?.login || "").toLowerCase();

    const bateGeral =
      termo === "" ||
      idCurto.includes(termo) ||
      nomeCliente.includes(termo) ||
      nomeHotel.includes(termo) ||
      zapCliente.includes(termo) ||
      autorNome.includes(termo) ||
      autorLogin.includes(termo);

    const bateCheckin =
      filtroCheckin === "" || (o.checkin && o.checkin === filtroCheckin);

    const bateColaborador =
      filtroColaborador === "todos" ||
      (o.criadoPor?.login && o.criadoPor.login.toLowerCase() === filtroColaborador.toLowerCase()) ||
      (o.criadoPor?.nome && o.criadoPor.nome.toLowerCase() === filtroColaborador.toLowerCase());

    const bateStatusVenda =
      filtroStatusVenda === "todos" ||
      (filtroStatusVenda === "fechado" && o.vendaFechada === true) ||
      (filtroStatusVenda === "aberto" && !o.vendaFechada);

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
      } else if (filtroPeriodo === "personalizado") {
        let inicioOk = true;
        let fimOk = true;

        if (dataInicioPersonalizada) {
          const [anoIni, mesIni, diaIni] = dataInicioPersonalizada.split("-").map(Number);
          const dataIniObj = new Date(anoIni, mesIni - 1, diaIni);
          dataIniObj.setHours(0, 0, 0, 0);
          inicioOk = dataCriacaoZerada.getTime() >= dataIniObj.getTime();
        }

        if (dataFimPersonalizada) {
          const [anoFim, mesFim, diaFim] = dataFimPersonalizada.split("-").map(Number);
          const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
          dataFimObj.setHours(23, 59, 59, 999);
          fimOk = dataCriacao.getTime() <= dataFimObj.getTime();
        }

        bateDataCriacao = inicioOk && fimOk;
      }
    }

    return bateGeral && bateCheckin && bateDataCriacao && bateColaborador && bateStatusVenda;
  });

  const vendasFechadasFiltradas = orcamentosFiltrados.filter((o) => o.vendaFechada);
  const totalFaturadoFechado = vendasFechadasFiltradas.reduce((acc, o) => {
    const valorStr = o.fechamento?.valorFechado || "";
    const num = parseFloat(String(valorStr).replace(/\./g, "").replace(",", ".")) || 0;
    return acc + num;
  }, 0);

  const ticketMedioFechado = vendasFechadasFiltradas.length > 0 
    ? totalFaturadoFechado / vendasFechadasFiltradas.length 
    : 0;

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

        <div className="flex items-center gap-2">
          {ehGestor && (
            <button
              onClick={() => setModalConfigFollowUpAberto(true)}
              className="p-2 bg-brand-800 hover:bg-brand-700 rounded-lg text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Configurar Modelos de Follow-up e Redes Sociais"
            >
              <Settings className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Follow-ups</span>
            </button>
          )}

          <button
            onClick={() => agencia && carregarDados(agencia.id)}
            className="p-2 bg-brand-800 hover:bg-brand-700 rounded-lg text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-2 space-y-4">
        {/* DASHBOARD EXECUTIVO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Vendas Fechadas
              </span>
              <p className="text-lg md:text-xl font-black text-emerald-700">
                R$ {totalFaturadoFechado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Cotações Convertidas
              </span>
              <p className="text-lg md:text-xl font-black text-slate-900">
                {vendasFechadasFiltradas.length} <span className="text-xs font-medium text-slate-400">venda(s)</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Ticket Médio
              </span>
              <p className="text-lg md:text-xl font-black text-amber-900">
                R$ {ticketMedioFechado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA, FILTROS AMPLOS E DATAS */}
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Pesquisar
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ID, Cliente, Hotel, Telefone..."
                  value={buscaGeral}
                  onChange={(e) => {
                    setBuscaGeral(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Vendedor / Usuário
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={filtroColaborador}
                  onChange={(e) => {
                    setFiltroColaborador(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-2 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-semibold"
                >
                  <option value="todos">Todos os Vendedores</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.login || c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Status
              </label>
              <select
                value={filtroStatusVenda}
                onChange={(e) => {
                  setFiltroStatusVenda(e.target.value);
                  setPaginaAtual(1);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-semibold"
              >
                <option value="todos">Todos Status</option>
                <option value="fechado">Vendas Fechadas</option>
                <option value="aberto">Em Aberto</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={limparFiltros}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
                title="Limpar todos os filtros"
              >
                <X className="w-4 h-4 text-slate-900" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>

          {/* FILTROS RÁPIDOS DE DATA DE CRIAÇÃO */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300 ml-1 animate-in fade-in">
                  <span className="text-[11px] font-bold text-slate-600 px-1">De:</span>
                  <input
                    type="date"
                    value={dataInicioPersonalizada}
                    onChange={(e) => {
                      setDataInicioPersonalizada(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
                  />
                  <span className="text-[11px] font-bold text-slate-600 px-1">Até:</span>
                  <input
                    type="date"
                    value={dataFimPersonalizada}
                    onChange={(e) => {
                      setDataFimPersonalizada(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>
              )}
            </div>

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
                const isFechado = Boolean(orc.vendaFechada);

                const linkZapDiretoSemMensagem = zapTratado
                  ? `https://wa.me/${zapTratado.startsWith("55") ? zapTratado : `55${zapTratado}`}`
                  : null;

                const urlVitrine = `/o/${orc.id}`;

                // Status dos follow-ups
                const f1Feito = Boolean(orc.followUp1Enviado);
                const f2Feito = Boolean(orc.followUp2Enviado);
                const f3Feito = Boolean(orc.followUp3Enviado);

                return (
                  <div
                    key={orc.id}
                    className={`bg-white p-4 md:p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                      isFechado ? "border-emerald-300 ring-1 ring-emerald-400/30" : "border-slate-200"
                    }`}
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

                        {isFechado && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3" /> Venda Fechada
                          </span>
                        )}

                        {isGrupo ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Grupo ({orc.apartamentosGrupo?.length || 0} aptos)
                          </span>
                        ) : orc.acomodacaoEscolhida && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {orc.acomodacaoEscolhida}
                          </span>
                        )}

                        {orc.criadoPor?.nome && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-purple-600" />
                            {orc.criadoPor.nome}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-normal ml-auto sm:ml-0">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatarDataHoraCriacao(orc.criadoEm)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <strong className="text-slate-800 block text-[11px]">Cliente:</strong>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-800">
                              {orc.clienteNome || "Não informado"}
                            </span>

                            {zapTratado && (
                              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[11px] text-slate-700 font-mono">
                                <span>{formatarNumeroTelefone(orc.clienteWhatsapp)}</span>

                                <a
                                  href={linkZapDiretoSemMensagem}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded transition hover:bg-emerald-50"
                                  title="Abrir WhatsApp direto"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => copiarTelefone(orc.clienteWhatsapp, orc.id)}
                                  className="text-slate-500 hover:text-slate-800 p-0.5 rounded transition hover:bg-slate-200"
                                  title="Copiar telefone"
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
                            {formatarHospedesLimpo(orc)}
                          </span>
                        </div>
                      </div>

                      {/* Valores Cotados */}
                      {!isGrupo && orc.regimes && orc.regimes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 mt-2 items-center">
                          {orc.regimes.map((r, rIdx) => {
                            const fechouNeste = isFechado && orc.fechamento?.regimeNome === r.nome;
                            return (
                              <span
                                key={rIdx}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                  fechouNeste 
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-400 font-bold ring-1 ring-emerald-500" 
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                }`}
                              >
                                <strong>{r.nome}:</strong> R$ {fechouNeste ? orc.fechamento.valorFechado : r.valor}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* AÇÕES RÁPIDAS & FOLLOW-UP INTELIGENTE */}
                    <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 shrink-0 justify-end">
                      {/* BOTÃO FECHAR VENDA / STATUS */}
                      {isFechado ? (
                        <button
                          type="button"
                          onClick={() => reabrirCotacao(orc)}
                          className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                          title="Clique para reabrir este orçamento"
                        >
                          <Undo2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Fechado</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModalFechamentoVenda(orc)}
                          className="flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                          title="Marcar orçamento como venda concluída"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fechar Venda</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => criarNovaCotacaoComDados(orc)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow active:scale-95"
                        title="Fazer novo orçamento pré-carregando os dados deste cliente"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Novo</span>
                      </button>

                      {/* ESTEIRA DE 3 BOTÕES COMPACTOS DE FOLLOW-UP */}
                      {zapTratado && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 px-1 flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3 text-emerald-600" /> Zap:
                          </span>

                          {/* Follow-up 1 */}
                          <button
                            type="button"
                            onClick={() => dispararFollowUp(orc, 1)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 ${
                              f1Feito
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={f1Feito ? `F1 já enviado em ${formatarDataHoraCriacao(orc.followUp1Em)} (clique para reenviar)` : "Enviar Follow-up 1: Proposta & Dúvidas"}
                          >
                            <span>1</span>
                            {f1Feito && <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />}
                          </button>

                          {/* Follow-up 2 */}
                          <button
                            type="button"
                            onClick={() => dispararFollowUp(orc, 2)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 ${
                              f2Feito
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={f2Feito ? `F2 já enviado em ${formatarDataHoraCriacao(orc.followUp2Em)} (clique para reenviar)` : "Enviar Follow-up 2: Oportunidades & Novas Ofertas"}
                          >
                            <span>2</span>
                            {f2Feito && <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />}
                          </button>

                          {/* Follow-up 3 */}
                          <button
                            type="button"
                            onClick={() => dispararFollowUp(orc, 3)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 ${
                              f3Feito
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={f3Feito ? `F3 já enviado em ${formatarDataHoraCriacao(orc.followUp3Em)} (clique para reenviar)` : "Enviar Follow-up 3: Encerramento com Instagram"}
                          >
                            <span>3</span>
                            {f3Feito && <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />}
                          </button>
                        </div>
                      )}

                      <Link
                        href={urlVitrine}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-slate-700 hover:text-brand-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition"
                        title="Abrir Vitrine"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vitrine</span>
                      </Link>

                      {ehGestor && (
                        <button
                          onClick={() => excluirOrcamento(orc.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                          title="Excluir cotação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONTROLES DE PAGINAÇÃO */}
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

      {/* MODAL PARA CONFIGURAR TEXTOS DOS FOLLOW-UPS E INSTAGRAM */}
      {modalConfigFollowUpAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Configurar Modelos de Follow-up (WhatsApp)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personalize as 3 mensagens automáticas enviadas para clientes pendentes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfigFollowUpAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarConfiguracoesAgencia} className="space-y-4">
              {/* Instagram */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-1">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  Instagram da Agência
                </label>
                <input
                  type="text"
                  placeholder="Ex: @caldasnovasviagem"
                  value={configFollowUp.instagram}
                  onChange={(e) => setConfigFollowUp((prev) => ({ ...prev, instagram: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Usado automaticamente na tag <code>{"{instagram}"}</code> do Follow-up 3.
                </span>
              </div>

              {/* Tags de Apoio */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <strong>Tags dinâmicas disponíveis:</strong>
                <div className="flex flex-wrap gap-1.5 pt-0.5 font-mono text-[10px]">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-300">{"{cliente}"}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-300">{"{hotel}"}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-300">{"{datas}"}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-300">{"{instagram}"}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-300">{"{link}"}</span>
                </div>
              </div>

              {/* Follow-up 1 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    1️⃣ Follow-up 1: Proposta & Dúvidas
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfigFollowUp((p) => ({ ...p, f1: MODELOS_FOLLOWUP_PADRAO.f1 }))}
                    className="text-[10px] text-brand-700 hover:underline font-bold"
                  >
                    Restaurar Padrão
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={configFollowUp.f1}
                  onChange={(e) => setConfigFollowUp((p) => ({ ...p, f1: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium resize-y leading-relaxed"
                />
              </div>

              {/* Follow-up 2 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    2️⃣ Follow-up 2: Oportunidades & Novas Ofertas
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfigFollowUp((p) => ({ ...p, f2: MODELOS_FOLLOWUP_PADRAO.f2 }))}
                    className="text-[10px] text-brand-700 hover:underline font-bold"
                  >
                    Restaurar Padrão
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={configFollowUp.f2}
                  onChange={(e) => setConfigFollowUp((p) => ({ ...p, f2: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium resize-y leading-relaxed"
                />
              </div>

              {/* Follow-up 3 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    3️⃣ Follow-up 3: Encerramento com Instagram
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfigFollowUp((p) => ({ ...p, f3: MODELOS_FOLLOWUP_PADRAO.f3 }))}
                    className="text-[10px] text-brand-700 hover:underline font-bold"
                  >
                    Restaurar Padrão
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={configFollowUp.f3}
                  onChange={(e) => setConfigFollowUp((p) => ({ ...p, f3: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalConfigFollowUpAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoConfigFollowUp}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-900 hover:bg-brand-950 transition shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {salvandoConfigFollowUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Modelos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA MARCAR VENDA FECHADA COM REGIME E VALOR */}
      {modalVendaConfig.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  Registrar Venda Fechada
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalVendaConfig.orcamento?.clienteNome || "Cliente"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Regime Fechado
                </label>
                <select
                  value={modalVendaConfig.regimeSelecionado}
                  onChange={(e) => {
                    const novoRegime = e.target.value;
                    const regimeObj = (modalVendaConfig.orcamento?.regimes || []).find(
                      (r) => r.nome === novoRegime
                    );
                    setModalVendaConfig((prev) => ({
                      ...prev,
                      regimeSelecionado: novoRegime,
                      valorFechado: regimeObj?.valor || prev.valorFechado,
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                >
                  {(modalVendaConfig.orcamento?.regimes || []).map((r, idx) => (
                    <option key={idx} value={r.nome}>
                      {r.nome} (R$ {r.valor})
                    </option>
                  ))}
                  {(!modalVendaConfig.orcamento?.regimes || modalVendaConfig.orcamento.regimes.length === 0) && (
                    <option value="Pacote Fechado">Pacote Fechado Geral</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Valor Total Fechado (R$)
                </label>
                <input
                  type="text"
                  value={modalVendaConfig.valorFechado}
                  onChange={(e) =>
                    setModalVendaConfig((prev) => ({
                      ...prev,
                      valorFechado: e.target.value,
                    }))
                  }
                  placeholder="Ex: 540,00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  setModalVendaConfig({
                    aberto: false,
                    orcamento: null,
                    regimeSelecionado: "",
                    valorFechado: "",
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarFechamentoVenda}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow"
              >
                Confirmar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTILIZADO DE CONFIRMAÇÃO / ALERTA */}
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
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
