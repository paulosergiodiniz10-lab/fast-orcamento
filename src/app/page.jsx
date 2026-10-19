"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Copy, Check, MessageSquare, Building2, ExternalLink, 
  Loader2, Hotel, LogOut, BedDouble, Baby, User, Phone, FileText,
  Users, Plus, Trash2, CopyPlus, RotateCcw, AlertCircle, HelpCircle,
  Send, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, MapPin,
  Tag, UserPlus, Eye, EyeOff, Ban, CheckCircle2, Pencil, Sparkles
} from "lucide-react";
import Link from "next/link";
import { db } from "../lib/firebase";
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp, 
  doc, getDoc, updateDoc, deleteDoc 
} from "firebase/firestore";
import { calcularTarifasEstadia } from "../lib/calculadoraTarifas";

const REGIMES_OPCOES = [
  { id: "sem_refeicao", label: "Sem refeições" },
  { id: "cafe", label: "Café da Manhã" },
  { id: "cafe_almoco", label: "Café + Almoço" },
  { id: "cafe_jantar", label: "Café + Jantar" },
  { id: "pensao_completa", label: "Pensão Completa" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatarTituloOrtografico = (texto) => {
  if (!texto) return "Parques que inclui no pacote";
  const limpo = texto.trim();
  if (limpo.length === 0) return "Parques que inclui no pacote";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

const obterDataHojeLocal = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const somarDias = (dataStr, dias) => {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + dias);
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
};

const formatarDataExibicao = (dataStr) => {
  if (!dataStr) return "--/--/----";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
};

const gerarSlug = (texto) => {
  if (!texto) return "hotel";
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

function DateRangePickerModerno({ checkin, checkout, onSelectCheckin, onSelectCheckout, dataMinima }) {
  const [aberto, setAberto] = useState(false);
  const [campoAtivo, setCampoAtivo] = useState("checkin");
  const containerRef = useRef(null);

  const hoje = dataMinima || obterDataHojeLocal();
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);

  const [anoVisivel, setAnoVisivel] = useState(anoHoje);
  const [mesVisivel, setMesVisivel] = useState(mesHoje - 1);

  useEffect(() => {
    function handleClickFora(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, [aberto]);

  const abrirParaCampo = (campo) => {
    setCampoAtivo(campo);
    const dataRef = campo === "checkin" ? (checkin || hoje) : (checkout || somarDias(checkin || hoje, 1));
    const [ano, mes] = dataRef.split("-").map(Number);
    setAnoVisivel(ano);
    setMesVisivel(mes - 1);
    setAberto(true);
  };

  const irMesAnterior = () => {
    if (mesVisivel === 0) {
      setMesVisivel(11);
      setAnoVisivel((a) => a - 1);
    } else {
      setMesVisivel((m) => m - 1);
    }
  };

  const irProximoMes = () => {
    if (mesVisivel === 11) {
      setMesVisivel(0);
      setAnoVisivel((a) => a + 1);
    } else {
      setMesVisivel((m) => m + 1);
    }
  };

  const limparParaHoje = () => {
    setAnoVisivel(anoHoje);
    setMesVisivel(mesHoje - 1);
    onSelectCheckin(hoje);
    onSelectCheckout(somarDias(hoje, 1));
    setAberto(false);
  };

  const primeiroDiaSemana = new Date(anoVisivel, mesVisivel, 1).getDay();
  const totalDiasMes = new Date(anoVisivel, mesVisivel + 1, 0).getDate();

  const handleCliqueDia = (dia) => {
    const mesFormatado = String(mesVisivel + 1).padStart(2, "0");
    const diaFormatado = String(dia).padStart(2, "0");
    const dataClicada = `${anoVisivel}-${mesFormatado}-${diaFormatado}`;

    if (campoAtivo === "checkin") {
      onSelectCheckin(dataClicada);
      onSelectCheckout(somarDias(dataClicada, 1));
      setAberto(false);
    } else {
      onSelectCheckout(dataClicada);
      setAberto(false);
    }
  };

  const dataMinimaPermitida = campoAtivo === "checkin" ? hoje : somarDias(checkin || hoje, 1);

  return (
    <div className="relative" ref={containerRef}>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => abrirParaCampo("checkin")}
          className={`text-left p-3 rounded-xl border transition flex items-center gap-3 ${
            aberto && campoAtivo === "checkin"
              ? "bg-white border-brand-900 ring-2 ring-brand-900/20 shadow-sm"
              : "bg-slate-50 border-slate-300 hover:bg-slate-100"
          }`}
        >
          <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Check-in</span>
            <span className="text-xs md:text-sm font-bold text-slate-900">
              {formatarDataExibicao(checkin)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => abrirParaCampo("checkout")}
          className={`text-left p-3 rounded-xl border transition flex items-center gap-3 ${
            aberto && campoAtivo === "checkout"
              ? "bg-white border-brand-900 ring-2 ring-brand-900/20 shadow-sm"
              : "bg-slate-50 border-slate-300 hover:bg-slate-100"
          }`}
        >
          <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Check-out</span>
            <span className="text-xs md:text-sm font-bold text-slate-900">
              {formatarDataExibicao(checkout)}
            </span>
          </div>
        </button>
      </div>

      {aberto && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[360px] mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={irMesAnterior}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="font-extrabold text-sm text-slate-800">
              {MESES[mesVisivel]} {anoVisivel}
            </h4>
            <button
              type="button"
              onClick={irProximoMes}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {DIAS_SEMANA.map((diaSem) => (
              <span key={diaSem} className="text-[11px] font-bold text-slate-400">
                {diaSem}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDiaSemana }).map((_, idx) => (
              <div key={`vazio-${idx}`} className="h-9 w-9" />
            ))}

            {Array.from({ length: totalDiasMes }).map((_, idx) => {
              const diaNum = idx + 1;
              const mesFormatado = String(mesVisivel + 1).padStart(2, "0");
              const diaFormatado = String(diaNum).padStart(2, "0");
              const dataAtualStr = `${anoVisivel}-${mesFormatado}-${diaFormatado}`;

              const desabilitado = dataAtualStr < dataMinimaPermitida;
              const isInicio = checkin === dataAtualStr;
              const isFim = checkout === dataAtualStr;
              const noIntervalo = checkin && checkout && dataAtualStr > checkin && dataAtualStr < checkout;

              let classeEstilo = "text-slate-800 hover:bg-slate-100";
              if (desabilitado) {
                classeEstilo = "text-slate-300 cursor-not-allowed";
              } else if (isInicio || isFim) {
                classeEstilo = "bg-brand-900 text-white font-black shadow-md rounded-full";
              } else if (noIntervalo) {
                classeEstilo = "bg-emerald-50 text-brand-950 font-bold rounded-none";
              }

              return (
                <button
                  key={dataAtualStr}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => handleCliqueDia(diaNum)}
                  className={`h-9 w-9 mx-auto flex items-center justify-center text-xs font-semibold rounded-lg transition ${classeEstilo}`}
                >
                  {diaNum}
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-600 font-semibold">
              {campoAtivo === "checkin" ? "Escolha a data de Check-in" : "Escolha a data de Check-out"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={limparParaHoje}
                className="text-slate-500 hover:text-brand-900 font-bold text-[11px] px-2 py-1 rounded transition"
              >
                Voltar p/ Hoje
              </button>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="bg-brand-900 hover:bg-brand-950 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeradorOrcamentoConteudo() {
  const searchParams = useSearchParams();
  const hojeStr = obterDataHojeLocal();

  const [abaAtiva, setAbaAtiva] = useState(searchParams.get("tipoOrcamento") === "grupos" ? "grupos" : "individual");

  const [agencia, setAgencia] = useState(null);
  const [hoteis, setHoteis] = useState([]);
  
  const [cidadeSelecionada, setCidadeSelecionada] = useState("todas");
  const [hotelSelecionado, setHotelSelecionado] = useState(null);
  const [aptoSelecionado, setAptoSelecionado] = useState("");

  const [clienteNome, setClienteNome] = useState(
    (searchParams.get("clienteNome") || "").toUpperCase()
  );
  const [clienteWhatsapp, setClienteWhatsapp] = useState(
    (searchParams.get("clienteWhatsapp") || "").replace(/\D/g, "")
  );

  const [checkin, setCheckin] = useState(hojeStr);
  const [checkout, setCheckout] = useState(somarDias(hojeStr, 1));

  const [adultos, setAdultos] = useState(searchParams.get("adultos") || "2");
  const [criancas, setCriancas] = useState(searchParams.get("criancas") || "0");
  const [idadesCriancas, setIdadesCriancas] = useState(searchParams.get("idadesCriancas") || "");
  const [regimesValores, setRegimesValores] = useState({});

  const [tarifasHotelAtivo, setTarifasHotelAtivo] = useState([]);
  const [regrasCriancasHotel, setRegrasCriancasHotel] = useState({});
  const [alertaTarifario, setAlertaTarifario] = useState("");
  const [descontoPercentual, setDescontoPercentual] = useState("");

  const [apartamentosGrupo, setApartamentosGrupo] = useState([
    {
      id: 1,
      adultos: "2",
      criancas: "0",
      idadesCriancas: "",
      acomodacao: "",
      valores: {},
    },
  ]);

  const [parquesMarcados, setParquesMarcados] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("• Cartão de Crédito: em até 10 X sem juros\n• PIX: com desconto especial");
  const [aptosRestantes, setAptosRestantes] = useState("2");

  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoZap, setEnviandoZap] = useState(false);
  const [linkGerado, setLinkGerado] = useState("");
  const [idOrcamentoAtual, setIdOrcamentoAtual] = useState("");

  const [modalConfig, setModalConfig] = useState({
    aberto: false,
    tipo: "confirm",
    titulo: "",
    mensagem: "",
    onConfirm: null,
  });

  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [usuariosEquipe, setUsuariosEquipe] = useState([]);
  const [carregandoEquipe, setCarregandoEquipe] = useState(false);
  const [mostrarSenhasEquipe, setMostrarSenhasEquipe] = useState({});
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [erroUsuario, setErroUsuario] = useState("");
  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: "",
    login: "",
    senha: "",
    permissao: "usuario",
  });

  const abrirAlerta = (titulo, mensagem) => {
    setModalConfig({
      aberto: true,
      tipo: "alert",
      titulo,
      mensagem,
      onConfirm: null,
    });
  };

  const abrirConfirmacao = (titulo, mensagem, onConfirm) => {
    setModalConfig({
      aberto: true,
      tipo: "confirm",
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
    carregarHoteisDaAgencia(ag.id);
  }, []);

  const carregarHoteisDaAgencia = async (agenciaId) => {
    try {
      const q = query(collection(db, "hoteis"), where("agenciaId", "==", agencyIdSafe(agenciaId)));
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));

      if (lista.length > 0) {
        setHoteis(lista);

        if (lista.length === 1) {
          const unicoHotel = lista[0];
          if (unicoHotel.cidade) {
            setCidadeSelecionada(unicoHotel.cidade);
          }
          selecionarHotel(unicoHotel);
          return;
        }

        const hotelNomeUrl = searchParams.get("hotelNome");
        const hotelEncontrado = hotelNomeUrl ? lista.find((h) => h.nome === hotelNomeUrl) : null;
        if (hotelEncontrado) {
          if (hotelEncontrado.cidade) {
            setCidadeSelecionada(hotelEncontrado.cidade);
          }
          selecionarHotel(hotelEncontrado);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar hotéis:", err);
    }
  };

  const agencyIdSafe = (id) => id || "";

  const carregarEquipe = async () => {
    if (!agencia?.id) return;
    setCarregandoEquipe(true);
    try {
      const colRef = collection(db, "agencias", agencia.id, "usuarios");
      const snap = await getDocs(colRef);
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setUsuariosEquipe(lista);
    } catch (err) {
      console.error("Erro ao buscar utilizadores:", err);
    } finally {
      setCarregandoEquipe(false);
    }
  };

  const abrirModalEquipe = () => {
    setModalEquipeAberto(true);
    carregarEquipe();
  };

  const alternarMostrarSenhaEquipe = (id) => {
    setMostrarSenhasEquipe((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const iniciarEdicaoUsuario = (u) => {
    setUsuarioEditandoId(u.id);
    setNovoUsuario({
      nome: u.nome || "",
      login: u.login || "",
      senha: u.senha || "",
      permissao: u.permissao || "usuario",
    });
  };

  const cancelarEdicaoUsuario = () => {
    setUsuarioEditandoId(null);
    setNovoUsuario({
      nome: "",
      login: "",
      senha: "",
      permissao: "usuario",
    });
  };

  const excluirUsuarioEquipe = (userId, nomeUser) => {
    abrirConfirmacao(
      "Excluir Colaborador",
      `Deseja realmente remover o colaborador "${nomeUser}"? Esta ação não poderá ser desfeita.`,
      async () => {
        try {
          await deleteDoc(doc(db, "agencias", agencia.id, "usuarios", userId));
          setUsuariosEquipe((prev) => prev.filter((u) => u.id !== userId));
          abrirAlerta("Sucesso", "Colaborador excluído com sucesso.");
        } catch (err) {
          console.error(err);
          abrirAlerta("Erro", "Não foi possível excluir o colaborador.");
        }
      }
    );
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    setErroUsuario("");

    if (!novoUsuario.nome.trim() || !novoUsuario.login.trim() || !novoUsuario.senha.trim()) {
      setErroUsuario("Preencha todos os campos.");
      return;
    }

    const loginNormalizado = novoUsuario.login.trim().toLowerCase();

    if (agencia?.usuario && agencia.usuario.toLowerCase() === loginNormalizado) {
      setErroUsuario("Este login já é utilizado pela agência principal.");
      return;
    }

    const jaExiste = usuariosEquipe.some(
      (u) => u.login.toLowerCase() === loginNormalizado && u.id !== usuarioEditandoId
    );
    if (jaExiste) {
      setErroUsuario("Já existe um utilizador com este login.");
      return;
    }

    setSalvandoUsuario(true);
    try {
      if (usuarioEditandoId) {
        const docRef = doc(db, "agencias", agencia.id, "usuarios", usuarioEditandoId);
        await updateDoc(docRef, {
          nome: novoUsuario.nome.trim(),
          login: loginNormalizado,
          senha: novoUsuario.senha.trim(),
          permissao: novoUsuario.permissao || "usuario",
          atualizadoEm: serverTimestamp(),
        });
        setUsuarioEditandoId(null);
      } else {
        const colRef = collection(db, "agencias", agencia.id, "usuarios");
        await addDoc(colRef, {
          nome: novoUsuario.nome.trim(),
          login: loginNormalizado,
          senha: novoUsuario.senha.trim(),
          permissao: novoUsuario.permissao || "usuario",
          status: "ativo",
          criadoEm: serverTimestamp(),
        });
      }

      setNovoUsuario({
        nome: "",
        login: "",
        senha: "",
        permissao: "usuario",
      });

      await carregarEquipe();
    } catch (err) {
      console.error(err);
      setErroUsuario("Não foi possível salvar o colaborador.");
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const alternarStatusUsuario = async (userId, statusAtual) => {
    if (!agencia?.id) return;
    const novoStatus = statusAtual === "ativo" ? "bloqueado" : "ativo";
    try {
      const docRef = doc(db, "agencias", agencia.id, "usuarios", userId);
      await updateDoc(docRef, { status: novoStatus });
      setUsuariosEquipe((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: novoStatus } : u))
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      abrirAlerta("Erro", "Não foi possível atualizar o status do utilizador.");
    }
  };

  const carregarDadosTarifarioHotel = async (hotelId) => {
    if (!hotelId) {
      setTarifasHotelAtivo([]);
      setRegrasCriancasHotel({});
      return;
    }

    try {
      const colTarifas = collection(db, "hoteis", hotelId, "tarifas");
      const snapTarifas = await getDocs(colTarifas);
      const lista = [];
      snapTarifas.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setTarifasHotelAtivo(lista);

      const docRegrasRef = doc(db, "hoteis", hotelId, "configuracoes", "regras_criancas");
      const snapRegras = await getDoc(docRegrasRef);
      if (snapRegras.exists()) {
        setRegrasCriancasHotel(snapRegras.data());
      } else {
        setRegrasCriancasHotel({});
      }
    } catch (err) {
      console.error("Erro ao carregar dados tarifários:", err);
    }
  };

  const selecionarHotel = (hotel) => {
    if (!hotel) {
      setHotelSelecionado(null);
      setParquesMarcados([]);
      setAptoSelecionado("");
      setRegimesValores({});
      setTarifasHotelAtivo([]);
      setRegrasCriancasHotel({});
      setAlertaTarifario("");
      return;
    }

    setHotelSelecionado(hotel);
    setParquesMarcados(hotel.parquesDisponiveis || []);
    setAptoSelecionado("");
    setRegimesValores({});

    carregarDadosTarifarioHotel(hotel.id);

    const partesPagamento = [];
    if (hotel.pagamentoCartao?.trim()) {
      partesPagamento.push(`• ${hotel.pagamentoCartao.trim()}`);
    }
    if (hotel.pagamentoPix?.trim()) {
      partesPagamento.push(`• ${hotel.pagamentoPix.trim()}`);
    }
    if (hotel.pagamentoBoleto?.trim()) {
      partesPagamento.push(`• ${hotel.pagamentoBoleto.trim()}`);
    }

    if (partesPagamento.length > 0) {
      setFormaPagamento(partesPagamento.join("\n"));
    } else if (hotel.formaPagamento && hotel.formaPagamento.trim() !== "") {
      const linhasConvertidas = hotel.formaPagamento
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("•") ? item : `• ${item}`))
        .join("\n");

      setFormaPagamento(linhasConvertidas);
    } else {
      setFormaPagamento("• Em até 10x sem juros\n• Com desconto especial no PIX");
    }
  };

  const hotelTemAptos = Boolean(hotelSelecionado?.tiposApto && hotelSelecionado.tiposApto.length > 0);
  const aptoLiberado = !hotelTemAptos || Boolean(aptoSelecionado);
  const gruposTodosAptosValidos = !hotelTemAptos || apartamentosGrupo.every((ap) => Boolean(ap.acomodacao));

  useEffect(() => {
    if (!hotelSelecionado) {
      setAlertaTarifario("");
      return;
    }

    if (!tarifasHotelAtivo || tarifasHotelAtivo.length === 0) {
      setAlertaTarifario("");
      return;
    }

    const numCr = parseInt(criancas, 10) || 0;
    const arrayIdades = [];

    if (numCr > 0) {
      const matches = idadesCriancas.match(/\d+/g);
      if (matches && matches.length > 0) {
        matches.forEach((m) => arrayIdades.push(parseInt(m, 10)));
      }

      const idadePadrao = Number(regrasCriancasHotel?.idadeMaximaCortesia ?? 12);
      while (arrayIdades.length < numCr) {
        arrayIdades.push(idadePadrao);
      }
    }

    const resultado = calcularTarifasEstadia({
      checkin,
      checkout,
      qtdAdultos: parseInt(adultos, 10) || 2,
      qtdCriancas: numCr,
      idadesCriancas: arrayIdades,
      tarifasHotel: tarifasHotelAtivo,
      regrasCriancas: regrasCriancasHotel,
      acomodacaoEscolhida: aptoSelecionado || null,
      desconto: { tipo: "porcentagem", valor: 0 },
    });

    if (resultado.sucesso) {
      setAlertaTarifario("");
      if (abaAtiva === "individual" && aptoLiberado && resultado.valoresPorRegime) {
        setRegimesValores(resultado.valoresPorRegime);
      }
    } else {
      setAlertaTarifario(resultado.mensagem || "");
      setRegimesValores({});
    }
  }, [
    checkin,
    checkout,
    adultos,
    criancas,
    idadesCriancas,
    tarifasHotelAtivo,
    regrasCriancasHotel,
    aptoSelecionado,
    hotelSelecionado,
    abaAtiva,
    aptoLiberado,
  ]);

  const cidadesDisponiveis = Array.from(
    new Set(hoteis.map((h) => h.cidade || "Caldas Novas").filter(Boolean))
  );

  const hoteisFiltradosPorCidade = hoteis.filter((h) => {
    if (cidadeSelecionada === "todas") return true;
    const cid = h.cidade || "Caldas Novas";
    return cid.toLowerCase() === cidadeSelecionada.toLowerCase();
  });

  const handleCidadeChange = (e) => {
    const novaCidade = e.target.value;
    setCidadeSelecionada(novaCidade);

    if (hotelSelecionado && novaCidade !== "todas") {
      const cidHotel = hotelSelecionado.cidade || "Caldas Novas";
      if (cidHotel.toLowerCase() !== novaCidade.toLowerCase()) {
        selecionarHotel(null);
      }
    }
  };

  const handleHotelChange = (e) => {
    const idEscolhido = e.target.value;
    if (!idEscolhido) {
      selecionarHotel(null);
      return;
    }
    const hotel = hoteis.find((h) => h.id === idEscolhido);
    if (hotel) {
      selecionarHotel(hotel);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fast_agencia");
    document.cookie = "fast_agencia_auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  const toggleParque = (parque) => {
    setParquesMarcados((prev) =>
      prev.includes(parque) ? prev.filter((p) => p !== parque) : [...prev, parque]
    );
  };

  const formatarMoeda = (valorDigitado) => {
    const apenasNumeros = String(valorDigitado || "").replace(/\D/g, "");
    if (!apenasNumeros || parseInt(apenasNumeros, 10) === 0) return "";

    const valorFloat = parseFloat(apenasNumeros) / 100;
    return valorFloat.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleValorChange = (regimeId, valor) => {
    const formatado = formatarMoeda(valor);
    setRegimesValores((prev) => ({ ...prev, [regimeId]: formatado }));
  };

  const calcularValorComDesconto = (valorOriginalStr) => {
    if (!valorOriginalStr || valorOriginalStr.trim() === "" || valorOriginalStr === "0,00") {
      return "";
    }

    const valorLimpo = String(valorOriginalStr).replace(/\./g, "").replace(",", ".");
    const valorNum = parseFloat(valorLimpo);
    if (isNaN(valorNum) || valorNum <= 0) return "";

    const taxaPerc = Math.min(Math.max(parseInt(descontoPercentual, 10) || 0, 0), 100);
    if (taxaPerc <= 0) {
      return valorNum.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    const valorFinal = valorNum * (1 - taxaPerc / 100);

    return valorFinal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const temDescontoAtivo = Boolean((parseInt(descontoPercentual, 10) || 0) > 0);

  const executarLimpeza = () => {
    setClienteNome("");
    setClienteWhatsapp("");

    if (hoteis.length === 1) {
      const unicoHotel = hoteis[0];
      if (unicoHotel.cidade) setCidadeSelecionada(unicoHotel.cidade);
      selecionarHotel(unicoHotel);
    } else {
      setCidadeSelecionada("todas");
      setHotelSelecionado(null);
    }

    setAptoSelecionado("");
    setCheckin(hojeStr);
    setCheckout(somarDias(hojeStr, 1));
    setAdultos("2");
    setCriancas("0");
    setIdadesCriancas("");
    setRegimesValores({});
    setDescontoPercentual("");
    setAlertaTarifario("");
    setApartamentosGrupo([
      {
        id: Date.now(),
        adultos: "2",
        criancas: "0",
        idadesCriancas: "",
        acomodacao: "",
        valores: {},
      },
    ]);
    setLinkGerado("");
    setIdOrcamentoAtual("");
  };

  const limparFormulario = () => {
    abrirConfirmacao(
      "Limpar Dados",
      "Deseja realmente limpar todos os dados preenchidos deste orçamento?",
      executarLimpeza
    );
  };

  const adicionarApartamentoGrupo = () => {
    setApartamentosGrupo((prev) => [
      ...prev,
      {
        id: Date.now(),
        adultos: "2",
        criancas: "0",
        idadesCriancas: "",
        acomodacao: "",
        valores: {},
      },
    ]);
  };

  const removerApartamentoGrupo = (id) => {
    if (apartamentosGrupo.length <= 1) {
      abrirAlerta("Atenção", "O orçamento de grupo deve conter pelo menos 1 apartamento.");
      return;
    }
    setApartamentosGrupo((prev) => prev.filter((ap) => ap.id !== id));
  };

  const atualizarApartamentoGrupo = (index, campo, valor) => {
    setApartamentosGrupo((prev) => {
      const novos = [...prev];
      novos[index] = { ...novos[index], [campo]: valor };
      return novos;
    });
  };

  const atualizarValorGrupo = (aptoIndex, regimeId, valor) => {
    const formatado = formatarMoeda(valor);
    setApartamentosGrupo((prev) => {
      const novos = [...prev];
      novos[aptoIndex] = {
        ...novos[aptoIndex],
        valores: {
          ...novos[aptoIndex].valores,
          [regimeId]: formatado,
        },
      };
      return novos;
    });
  };

  const duplicarValoresAptoAnterior = (indexAtual) => {
    if (indexAtual === 0) return;
    setApartamentosGrupo((prev) => {
      const novos = [...prev];
      const aptoAnterior = novos[indexAtual - 1];
      novos[indexAtual] = { 
        ...novos[indexAtual], 
        adultos: aptoAnterior.adultos || "2",
        criancas: aptoAnterior.criancas || "0",
        idadesCriancas: aptoAnterior.idadesCriancas || "",
        acomodacao: aptoAnterior.acomodacao || "",
        valores: { ...(aptoAnterior.valores || {}) } 
      };
      return novos;
    });
  };

  const formatarDescricaoHospedes = (ad, cr, idades) => {
    const qtdAd = parseInt(ad, 10) || 0;
    const qtdCr = parseInt(cr, 10) || 0;
    const adStr = qtdAd < 10 ? `0${qtdAd}` : `${qtdAd}`;
    let texto = `${adStr} adulto${qtdAd > 1 ? "s" : ""}`;

    if (qtdCr > 0) {
      const crStr = qtdCr < 10 ? `0${qtdCr}` : `${qtdCr}`;
      texto += ` + ${crStr} criança${qtdCr > 1 ? "s" : ""}`;
      if (idades && idades.trim()) {
        texto += ` (${idades.trim()})`;
      }
    }
    return texto;
  };

  const formatarDatas = () => {
    if (!checkin || !checkout) return "";
    const [anoIn, mesIn, diaIn] = checkin.split("-");
    const [anoOut, mesOut, diaOut] = checkout.split("-");
    return `${diaIn}/${mesIn} a ${diaOut}/${mesOut}/${anoOut}`;
  };

  const numCriancas = parseInt(criancas, 10) || 0;

  const gerarTextoZap = (urlVitrine, idDoc, modo = "copiar") => {
    if (!hotelSelecionado) {
      return "Selecione uma hospedagem para gerar a prévia do orçamento.";
    }

    if (alertaTarifario) {
      return "Ajuste o período da estadia para atender às regras do pacote antes de gerar.";
    }

    if (abaAtiva === "individual" && hotelTemAptos && !aptoSelecionado) {
      return "Selecione o tipo de apartamento cotado para gerar a prévia do orçamento.";
    }

    if (abaAtiva === "grupos" && hotelTemAptos && !gruposTodosAptosValidos) {
      return "Selecione o tipo de acomodação de cada apartamento para gerar a prévia do grupo.";
    }

    const iconeParque = modo === "copiar" ? "👉" : "•";
    const iconeCartao = modo === "copiar" ? "💳 " : "";
    const iconeAviso = modo === "copiar" ? "⚠️ " : "*Atenção:* ";
    const iconeLink = modo === "copiar" ? "🔗 " : "";
    const iconeId = modo === "copiar" ? "🆔 " : "";

    let texto = "";

    if (clienteNome.trim()) {
      texto += `Olá, *${clienteNome.trim().toUpperCase()}*! Segue seu orçamento:\n\n`;
    }

    texto += `*${hotelSelecionado.nome.toUpperCase()}*\n`;
    texto += `${formatarDatas()}\n\n`;

    if (parquesMarcados.length > 0) {
      const tituloInclusoTratado = formatarTituloOrtografico(hotelSelecionado.tituloInclusoPacote);
      texto += `*${tituloInclusoTratado}:*\n`;
      parquesMarcados.forEach((p) => {
        texto += `${iconeParque} ${p}\n`;
      });
      texto += `\n`;
    }

    const mostrarTituloValores = hotelSelecionado.mostrarTituloValores !== false;
    const tituloValores = hotelSelecionado.tituloValoresCustomizado?.trim() || "Valor total do pacote:";
    if (mostrarTituloValores && tituloValores.length > 0) {
      texto += `*${tituloValores}*\n\n`;
    }

    if (abaAtiva === "individual") {
      let textoHospedes = `${adultos} adulto(s)`;
      if (numCriancas > 0) {
        textoHospedes += ` e ${numCriancas} criança(s)`;
        if (idadesCriancas.trim()) {
          textoHospedes += ` (${idadesCriancas.trim()})`;
        }
      }
      texto += `*${textoHospedes}*\n`;
      if (aptoSelecionado) {
        texto += `Acomodação: ${aptoSelecionado}\n\n`;
      } else {
        texto += `\n`;
      }

      const regimesComValor = REGIMES_OPCOES.filter((r) => {
        const val = regimesValores[r.id];
        return val && val.trim() !== "" && val.trim() !== "0,00" && val.trim() !== "0";
      });

      regimesComValor.forEach((reg) => {
        const valorComDesconto = calcularValorComDesconto(regimesValores[reg.id]);
        texto += `*${reg.label}:*\nR$ ${valorComDesconto}\n\n`;
      });
    } else {
      apartamentosGrupo.forEach((ap) => {
        const descHosp = formatarDescricaoHospedes(ap.adultos, ap.criancas, ap.idadesCriancas);
        texto += `*${descHosp}*\n`;
        if (ap.acomodacao) {
          texto += `Acomodação: ${ap.acomodacao}\n\n`;
        } else {
          texto += `\n`;
        }

        const regimesComValor = REGIMES_OPCOES.filter((r) => {
          const val = ap.valores[r.id];
          return val && val.trim() !== "" && val.trim() !== "0,00" && val.trim() !== "0";
        });

        if (regimesComValor.length > 0) {
          regimesComValor.forEach((reg) => {
            const valorComDesconto = calcularValorComDesconto(ap.valores[reg.id]);
            texto += `${reg.label}\nR$ ${valorComDesconto}\n\n`;
          });
        } else {
          texto += `_Valores sob consulta_\n\n`;
        }
      });
    }

    if (temDescontoAtivo) {
      texto += `🔥 *Promoção especial com desconto exclusivo!*\n\n`;
    }

    if (formaPagamento && formaPagamento.trim()) {
      texto += `${iconeCartao}*Formas de Pagamento:*\n${formaPagamento.trim()}\n\n`;
    }

    if (aptosRestantes) {
      texto += `${iconeAviso}Restam apenas ${aptosRestantes} apartamentos disponíveis!\n\n`;
    }

    const finalUrl = urlVitrine || linkGerado || (typeof window !== "undefined" ? window.location.origin : "");
    if (finalUrl) {
      const urlSemProtocolo = finalUrl.replace(/^https?:\/\//, "");
      texto += `${iconeLink}*Fotos e detalhes completos:*\n${urlSemProtocolo}\n\n`;
    }
    texto += `_Oferta sujeita a alteração e disponibilidade sem prévio aviso._\n`;

    const idFinal = idDoc || idOrcamentoAtual;
    if (idFinal) {
      const idCurto = idFinal.slice(0, 6).toUpperCase();
      texto += `${iconeId}*ID:* #${idCurto}`;
    }

    return texto;
  };

  const processarGravacaoOrcamento = async () => {
    if (!hotelSelecionado) {
      abrirAlerta("Hospedagem Necessária", "Por favor, selecione uma hospedagem na lista antes de gerar.");
      return null;
    }

    if (alertaTarifario) {
      abrirAlerta("Período Inválido", "Ajuste o período da estadia para atender às regras do pacote antes de gravar.");
      return null;
    }

    if (abaAtiva === "individual" && hotelTemAptos && !aptoSelecionado) {
      abrirAlerta("Acomodação Obrigatória", "Por favor, selecione o Tipo de Apartamento Cotado antes de gerar.");
      return null;
    }

    if (abaAtiva === "grupos" && hotelTemAptos && !gruposTodosAptosValidos) {
      abrirAlerta("Acomodação Obrigatória", "Por favor, selecione o Tipo de Apartamento de todos os quartos do grupo antes de gerar.");
      return null;
    }

    let hospedesFormatado = `${adultos} Adulto(s)`;
    if (numCriancas > 0) {
      hospedesFormatado += ` e ${numCriancas} Criança(s)`;
      if (idadesCriancas.trim()) {
        hospedesFormatado += ` (${idadesCriancas.trim()})`;
      }
    }

    const apartamentosTratados = apartamentosGrupo.map((ap) => {
      const valoresComDesconto = {};
      Object.keys(ap.valores || {}).forEach((k) => {
        valoresComDesconto[k] = calcularValorComDesconto(ap.valores[k]);
      });

      return {
        ...ap,
        valores: valoresComDesconto,
        titulo: formatarDescricaoHospedes(ap.adultos, ap.criancas, ap.idadesCriancas),
      };
    });

    const regimesFiltradosGravar = REGIMES_OPCOES.filter((r) => {
      const val = regimesValores[r.id];
      return val && val.trim() !== "" && val.trim() !== "0,00" && val.trim() !== "0";
    }).map((r) => ({
      id: r.id,
      nome: r.label,
      valor: calcularValorComDesconto(regimesValores[r.id]),
    }));

    const taxaPercNum = Math.min(Math.max(parseInt(descontoPercentual, 10) || 0, 0), 100);

    const dadosOrcamento = {
      agenciaId: agencia?.id || "avulso",
      tipoOrcamento: abaAtiva,
      clienteNome: clienteNome.trim().toUpperCase() || null,
      clienteWhatsapp: clienteWhatsapp.replace(/\D/g, "") || null,
      hotel: {
        nome: hotelSelecionado.nome,
        cidade: hotelSelecionado.cidade || "Caldas Novas",
        estado: hotelSelecionado.estado || "GO",
        logoUrl: hotelSelecionado.logoUrl || "",
        localizacao: hotelSelecionado.localizacao || "",
        descricao: hotelSelecionado.descricao || "",
        observacoes: hotelSelecionado.observacoes || "",
        checkinHora: hotelSelecionado.checkinHora || "14:00",
        checkoutHora: hotelSelecionado.checkoutHora || "11:00",
        videoUrl: hotelSelecionado.videoUrl || "",
        fotos: hotelSelecionado.fotos || [],
        tiposApto: hotelSelecionado.tiposApto || [],
        tituloInclusoPacote: formatarTituloOrtografico(hotelSelecionado.tituloInclusoPacote),
        tituloFotosParque: hotelSelecionado.tituloFotosParque || "Fotos dos Parques Aquáticos",
        fotosParque: hotelSelecionado.fotosParque || [],
        tituloVideoParque: hotelSelecionado.tituloVideoParque || "Vídeo dos Parques Aquáticos",
        videoParqueUrl: hotelSelecionado.videoParqueUrl || "",
        mostrarTituloValores: hotelSelecionado.mostrarTituloValores !== false,
        tituloValoresCustomizado: hotelSelecionado.tituloValoresCustomizado || "Valor total do pacote:",
      },
      acomodacaoEscolhida: aptoSelecionado || null,
      agencia: {
        nome: agencia?.nome || "Caldas Novas Viagens",
        whatsapp: agencia?.whatsapp || "",
        cadastur: agencia?.cadastur || "",
      },
      criadoPor: {
        nome: agencia?.nomeUsuario || agencia?.nome || "Colaborador",
        login: agencia?.loginUsuario || agencia?.usuario || "",
        permissao: agencia?.permissao || "gestor",
      },
      checkin,
      checkout,
      periodoFormatado: formatarDatas(),
      adultos,
      criancas,
      idadesCriancas: numCriancas > 0 ? idadesCriancas.trim() : "",
      hospedes: abaAtiva === "individual" ? hospedesFormatado : `Grupo com ${apartamentosGrupo.length} apartamento(s)`,
      parques: parquesMarcados,
      regimes: regimesFiltradosGravar,
      apartamentosGrupo: abaAtiva === "grupos" ? apartamentosTratados : null,
      formaPagamento,
      aptosRestantes,
      descontoAplicado: taxaPercNum > 0 ? { tipo: "porcentagem", valor: String(taxaPercNum) } : null,
      criadoEm: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "orcamentos"), dadosOrcamento);

    const slugHotel = gerarSlug(hotelSelecionado.nome);
    const codigoCurto = docRef.id.slice(0, 6);
    const urlCompleta = `${window.location.origin}/o/${slugHotel}-${codigoCurto}`;

    setLinkGerado(urlCompleta);
    setIdOrcamentoAtual(docRef.id);

    return { urlCompleta, idDoc: docRef.id };
  };

  const salvarEGerarLink = async () => {
    try {
      setSalvando(true);
      const resultado = await processarGravacaoOrcamento();
      if (!resultado) return;

      const textoFinal = gerarTextoZap(resultado.urlCompleta, resultado.idDoc, "copiar");
      navigator.clipboard.writeText(textoFinal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);

      return resultado.urlCompleta;
    } catch (err) {
      console.error("Erro ao salvar orçamento:", err);
      abrirAlerta("Erro de Conexão", "Não foi possível conectar com o Firebase. Verifique sua conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const salvarEEnviarZapCliente = async () => {
    const zapPuro = clienteWhatsapp.replace(/\D/g, "");
    if (!clienteNome.trim() || zapPuro.length < 10) {
      abrirAlerta(
        "Dados Incompletos",
        "Para enviar diretamente, informe o nome e o número de WhatsApp completo com DDD."
      );
      return;
    }

    try {
      setEnviandoZap(true);
      const resultado = await processarGravacaoOrcamento();
      if (!resultado) return;

      const textoSeguro = gerarTextoZap(resultado.urlCompleta, resultado.idDoc, "enviar");
      const textoCopiar = gerarTextoZap(resultado.urlCompleta, resultado.idDoc, "copiar");
      navigator.clipboard.writeText(textoCopiar);

      const numeroFormatado = zapPuro.startsWith("55") ? zapPuro : `55${zapPuro}`;
      const urlWhatsapp = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(textoSeguro)}`;

      window.open(urlWhatsapp, "_blank");
    } catch (err) {
      console.error("Erro ao salvar e enviar:", err);
      abrirAlerta("Erro de Conexão", "Não foi possível gravar os dados para envio.");
    } finally {
      setEnviandoZap(false);
    }
  };

  const podeEnviarDireto = Boolean(
    clienteNome.trim().length > 0 &&
    clienteWhatsapp.replace(/\D/g, "").length >= 10 &&
    hotelSelecionado &&
    !alertaTarifario &&
    (abaAtiva === "individual" ? aptoLiberado : gruposTodosAptosValidos)
  );

  const opcoesCriancasHotel = (hotelSelecionado?.opcoesCriancas || []).filter(
    (op) => Boolean(op && op.trim().length > 0)
  );

  const ehGestor = !agencia?.permissao || agencia.permissao === "gestor";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans relative">
      <header className="bg-brand-900 text-white px-4 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-700 p-2 rounded-lg text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide">Fast Orçamento</h1>
            <p className="text-[11px] text-brand-100 flex items-center gap-1.5">
              <span>{agencia?.nome || "Painel da Agência"}</span>
              {agencia?.nomeUsuario && (
                <span className="bg-brand-800/80 px-1.5 py-0.2 rounded text-[10px] text-emerald-300">
                  {agencia.nomeUsuario} ({ehGestor ? "Gestor" : "Usuário"})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/orcamentos"
            className="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            title="Ver Cotações Salvas"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Cotações</span>
          </Link>

          {ehGestor && (
            <>
              <Link
                href="/hoteis"
                className="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                <Hotel className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Hotéis</span>
              </Link>

              <button
                type="button"
                onClick={abrirModalEquipe}
                className="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                title="Gerenciar Equipa de Utilizadores"
              >
                <Users className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">Equipa</span>
              </button>
            </>
          )}

          <button
            onClick={salvarEGerarLink}
            disabled={
              salvando || 
              enviandoZap || 
              !hotelSelecionado || 
              Boolean(alertaTarifario) ||
              (abaAtiva === "individual" ? !aptoLiberado : !gruposTodosAptosValidos)
            }
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copiado ? (
              <Check className="w-4 h-4 text-emerald-200" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{salvando ? "Gerando..." : copiado ? "Copiado!" : "Gerar e Copiar"}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair da conta"
            className="p-2 text-brand-200 hover:text-white hover:bg-brand-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          
          {/* ================= SELETOR DE ABAS ================= */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300 shadow-inner">
            <button
              type="button"
              onClick={() => setAbaAtiva("individual")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                abaAtiva === "individual"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Individual (1 Apto)</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("grupos")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                abaAtiva === "grupos"
                  ? "bg-brand-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Grupos (Múltiplos Aptos)</span>
            </button>
          </div>

          {/* ================= QUADRO: DADOS DO CLIENTE ================= */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-brand-700" />
                Dados do Cliente <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
              </label>

              <button
                type="button"
                onClick={limparFormulario}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
                title="Limpar todos os campos desta cotação"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Dados</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome do Cliente</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  <input
                    type="text"
                    placeholder="EX: JOÃO SILVA"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-8 pr-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">WhatsApp com DDD</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 11999999999"
                    value={clienteWhatsapp}
                    onChange={(e) => setClienteWhatsapp(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-8 pr-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ================= ESCOLHA DA CIDADE E HOSPEDAGEM ================= */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-700" />
                Escolha a Cidade
              </label>
              <select
                value={cidadeSelecionada}
                onChange={handleCidadeChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 text-xs md:text-sm font-semibold focus:ring-2 focus:ring-brand-900 outline-none"
              >
                <option value="todas">-- Todas as Cidades --</option>
                {cidadesDisponiveis.map((cid) => (
                  <option key={cid} value={cid}>
                    {cid}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Escolha sua Hospedagem
                </label>
                {ehGestor && (
                  <Link href="/hoteis" className="text-xs text-brand-700 hover:underline font-semibold">
                    + Gerenciar
                  </Link>
                )}
              </div>

              {hoteis.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Nenhuma hospedagem cadastrada.{" "}
                  {ehGestor && (
                    <Link href="/hoteis" className="underline font-bold">
                      Clique aqui para cadastrar a primeira.
                    </Link>
                  )}
                </div>
              ) : hoteisFiltradosPorCidade.length === 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                  Nenhum hotel cadastrado nesta cidade. Selecione outra cidade acima ou adicione novos hotéis.
                </div>
              ) : (
                <select
                  value={hotelSelecionado?.id || ""}
                  onChange={handleHotelChange}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-900 outline-none"
                >
                  <option value="">-- Selecione uma hospedagem --</option>
                  {hoteisFiltradosPorCidade.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {abaAtiva === "individual" && hotelTemAptos && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-brand-700" />
                    Tipo de Apartamento Cotado *
                  </label>
                  {!aptoSelecionado && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Obrigatório selecionar
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {hotelSelecionado.tiposApto.map((ap, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAptoSelecionado(ap.nome)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition shadow-xs ${
                        aptoSelecionado === ap.nome
                          ? "bg-brand-900 text-white border-brand-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:border-brand-900 hover:bg-slate-50"
                      }`}
                    >
                      {ap.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= DATAS (COMUM PARA AS DUAS ABAS) ================= */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-brand-700" />
              Período da Estadia
            </label>
            <DateRangePickerModerno
              checkin={checkin}
              checkout={checkout}
              onSelectCheckin={setCheckin}
              onSelectCheckout={setCheckout}
              dataMinima={hojeStr}
            />

            {alertaTarifario && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{alertaTarifario}</span>
              </div>
            )}
          </div>

          {/* ================= TRAVA DE ERRO TARIFÁRIO GERAL ================= */}
          {alertaTarifario ? (
            <div className="bg-red-50 border-2 border-dashed border-red-300 p-6 rounded-2xl text-center space-y-2 animate-in fade-in">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h3 className="font-bold text-sm text-red-900">Período Não Permitido</h3>
              <p className="text-xs text-red-700 max-w-sm mx-auto">
                {alertaTarifario} Ajuste as datas de check-in e check-out no calendário acima para liberar os demais campos.
              </p>
            </div>
          ) : (
            <>
              {/* ================= CORPO DA ABA INDIVIDUAL ================= */}
              {abaAtiva === "individual" && (
                <>
                  {hotelTemAptos && !aptoSelecionado ? (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-6 rounded-2xl text-center space-y-2 animate-in fade-in">
                      <BedDouble className="w-8 h-8 text-amber-600 mx-auto" />
                      <h3 className="font-bold text-sm text-amber-900">Selecione o Tipo de Apartamento</h3>
                      <p className="text-xs text-amber-700 max-w-sm mx-auto">
                        Para liberar hóspedes e cálculo de valores, clique em uma das categorias de apartamento acima.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Adultos</label>
                            <input
                              type="number"
                              min="1"
                              value={adultos}
                              onChange={(e) => setAdultos(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Crianças</label>
                            <input
                              type="number"
                              min="0"
                              value={criancas}
                              onChange={(e) => setCriancas(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                            />
                          </div>
                        </div>

                        {numCriancas > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-1">
                              <Baby className="w-3.5 h-3.5 text-brand-700" />
                              Idades / Detalhes das Crianças
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: até 12 anos (ou '5 e 9 anos')"
                              value={idadesCriancas}
                              onChange={(e) => setIdadesCriancas(e.target.value)}
                              className="w-full bg-amber-50/60 border border-amber-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                            />

                            {opcoesCriancasHotel.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Opções rápidas:</span>
                                {opcoesCriancasHotel.map((opcaoTexto, opIdx) => (
                                  <button
                                    key={opIdx}
                                    type="button"
                                    onClick={() => setIdadesCriancas(opcaoTexto)}
                                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border transition ${
                                      idadesCriancas === opcaoTexto
                                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                        : "bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:border-amber-400"
                                    }`}
                                  >
                                    {opcaoTexto}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                        <div className="border-b border-slate-100 pb-3 space-y-2">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Regimes de Pensão e Valores (R$)
                          </label>

                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-emerald-50/90 border border-emerald-300 p-2.5 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                Desconto:
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <div className="inline-flex items-center bg-white border border-emerald-300 rounded-lg overflow-hidden shadow-xs">
                                <span className="bg-emerald-600 text-white text-xs font-black px-3 py-2 flex items-center justify-center">
                                  %
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={descontoPercentual}
                                  onChange={(e) => {
                                    const valorNumerico = e.target.value.replace(/\D/g, "");
                                    setDescontoPercentual(valorNumerico);
                                  }}
                                  className="w-20 bg-white py-1.5 px-3 text-sm text-center font-bold text-emerald-950 outline-none"
                                />
                              </div>

                              {descontoPercentual !== "" && (
                                <button
                                  type="button"
                                  onClick={() => setDescontoPercentual("")}
                                  className="text-xs font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition"
                                  title="Limpar desconto"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {REGIMES_OPCOES.map((reg) => (
                          <div key={reg.id} className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 w-36 truncate">{reg.label}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              value={regimesValores[reg.id] || ""}
                              onChange={(e) => handleValorChange(reg.id, e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-brand-900 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ================= CORPO DA ABA GRUPOS ================= */}
              {abaAtiva === "grupos" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-brand-700" />
                      Apartamentos do Grupo ({apartamentosGrupo.length})
                    </label>
                    <button
                      type="button"
                      onClick={adicionarApartamentoGrupo}
                      className="bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Apartamento
                    </button>
                  </div>

                  <div 
                    className="max-h-[620px] overflow-y-auto pr-2 space-y-4 rounded-xl border border-slate-200 p-2 bg-slate-100/50 shadow-inner"
                    style={{
                      scrollbarWidth: "auto",
                      scrollbarColor: "#94a3b8 #f1f5f9",
                    }}
                  >
                    {apartamentosGrupo.map((apto, index) => {
                      const numCrApto = parseInt(apto.criancas, 10) || 0;
                      const aptoQuartoEscolhido = !hotelTemAptos || Boolean(apto.acomodacao);

                      return (
                        <div key={apto.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-extrabold text-xs text-brand-900 uppercase">
                              Apartamento #{index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => duplicarValoresAptoAnterior(index)}
                                  className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded"
                                  title="Copiar configuração do apartamento anterior"
                                >
                                  <CopyPlus className="w-3 h-3" />
                                  Repetir Apto #{index}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removerApartamentoGrupo(apto.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded"
                                title="Remover apartamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {hotelTemAptos && (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase text-slate-700 flex items-center gap-1">
                                  <BedDouble className="w-3.5 h-3.5 text-brand-700" />
                                  Tipo de Apartamento deste Quarto *
                                </label>
                                {!apto.acomodacao && (
                                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                                    Obrigatório
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {hotelSelecionado.tiposApto.map((tipoAp, tipoIdx) => (
                                  <button
                                    key={tipoIdx}
                                    type="button"
                                    onClick={() => atualizarApartamentoGrupo(index, "acomodacao", tipoAp.nome)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition ${
                                      apto.acomodacao === tipoAp.nome
                                        ? "bg-brand-900 text-white border-brand-900 shadow-sm"
                                        : "bg-white text-slate-700 border-slate-300 hover:border-brand-900 hover:bg-slate-50"
                                    }`}
                                  >
                                    {tipoAp.nome}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {!aptoQuartoEscolhido ? (
                            <div className="p-3 bg-amber-50/70 border border-dashed border-amber-300 rounded-xl text-center">
                              <p className="text-xs text-amber-800 font-semibold">
                                Selecione o tipo de apartamento deste quarto acima para preencher hóspedes e valores.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3 pt-1 animate-in fade-in">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                    Adultos
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={apto.adultos || "2"}
                                    onChange={(e) => atualizarApartamentoGrupo(index, "adultos", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold outline-none focus:ring-1 focus:ring-brand-900"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                    Crianças
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={apto.criancas || "0"}
                                    onChange={(e) => atualizarApartamentoGrupo(index, "criancas", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold outline-none focus:ring-1 focus:ring-brand-900"
                                  />
                                </div>
                              </div>

                              {numCrApto > 0 && (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-0.5">
                                    <Baby className="w-3.5 h-3.5 text-brand-700" />
                                    Idades / Detalhes das Crianças
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: 13 anos (ou '5 e 9 anos')"
                                    value={apto.idadesCriancas || ""}
                                    onChange={(e) => atualizarApartamentoGrupo(index, "idadesCriancas", e.target.value)}
                                    className="w-full bg-amber-50/60 border border-amber-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
                                  />

                                  {opcoesCriancasHotel.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 pt-1">
                                      {opcoesCriancasHotel.map((opTexto, opIdx) => (
                                        <button
                                          key={opIdx}
                                          type="button"
                                          onClick={() => atualizarApartamentoGrupo(index, "idadesCriancas", opTexto)}
                                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border transition ${
                                            apto.idadesCriancas === opTexto
                                              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                              : "bg-white text-slate-700 border-slate-300 hover:bg-amber-50"
                                          }`}
                                        >
                                          {opTexto}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="pt-2 border-t border-slate-100 space-y-2">
                                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                                  Valores para este Apto (R$):
                                </span>
                                {REGIMES_OPCOES.map((reg) => (
                                  <div key={reg.id} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-700 w-36 truncate">{reg.label}</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0,00"
                                      value={apto.valores[reg.id] || ""}
                                      onChange={(e) => atualizarValorGrupo(index, reg.id, e.target.value)}
                                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-semibold focus:ring-1 focus:ring-brand-900 outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================= INCLUSÕES, PARQUES E BENEFÍCIOS ================= */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  {hotelSelecionado?.tituloInclusoPacote
                    ? formatarTituloOrtografico(hotelSelecionado.tituloInclusoPacote)
                    : "Parques e Benefícios"}
                </label>
                {hotelSelecionado?.parquesDisponiveis?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {hotelSelecionado.parquesDisponiveis.map((parque) => {
                      const ativo = parquesMarcados.includes(parque);
                      return (
                        <button
                          key={parque}
                          type="button"
                          onClick={() => toggleParque(parque)}
                          className={`text-xs text-left p-2.5 rounded-lg border flex items-center gap-2 font-medium transition ${
                            ativo
                              ? "bg-brand-50 border-brand-700 text-brand-900 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${ativo ? "bg-brand-900 border-brand-900 text-white" : "border-slate-300"}`}>
                            {ativo && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className="truncate">{parque}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {hotelSelecionado ? "Nenhum benefício cadastrado para esta hospedagem." : "Selecione uma hospedagem acima para carregar as opções de inclusões."}
                  </p>
                )}
              </div>

              {/* ================= APTOS RESTANTES E FORMA DE PAGAMENTO ================= */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Aptos Disponíveis</label>
                  <input
                    type="text"
                    value={aptosRestantes}
                    onChange={(e) => setAptosRestantes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Forma de Pagamento (Linhas no WhatsApp)</label>
                  <textarea
                    rows={3}
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-medium resize-y leading-relaxed"
                    placeholder={"• Em até 10x sem juros\n• Com desconto especial no PIX"}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================= PRÉVIA DO WHATSAPP ================= */}
        <div className="md:sticky md:top-20 h-fit space-y-3">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
            <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-3 gap-2">
              <span className="text-xs font-bold uppercase text-brand-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-700" />
                Prévia do WhatsApp {abaAtiva === "grupos" && <span className="text-emerald-700 text-[10px] lowercase font-normal">(modo grupos)</span>}
              </span>

              <div className="flex items-center gap-2">
                {podeEnviarDireto && (
                  <button
                    onClick={salvarEEnviarZapCliente}
                    disabled={enviandoZap || salvando}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow disabled:opacity-50"
                    title={`Salvar e enviar diretamente para ${clienteNome}`}
                  >
                    {enviandoZap ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{enviandoZap ? "Enviando..." : "Salvar / Enviar"}</span>
                  </button>
                )}

                <button
                  onClick={salvarEGerarLink}
                  disabled={
                    salvando || 
                    enviandoZap || 
                    !hotelSelecionado || 
                    Boolean(alertaTarifario) ||
                    (abaAtiva === "individual" ? !aptoLiberado : !gruposTodosAptosValidos)
                  }
                  className="bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  {salvando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : copiado ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{salvando ? "Salvando..." : copiado ? "Copiado!" : "Salvar e Copiar"}</span>
                </button>
              </div>
            </div>

            <div className="bg-[#f0f4f2] p-4 rounded-lg font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-200">
              {gerarTextoZap(undefined, undefined, "copiar")}
            </div>

            {linkGerado && (
              <div className="mt-3 p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between">
                <div className="truncate mr-2">
                  <p className="text-[10px] font-bold uppercase text-brand-800">Vitrine Ativa</p>
                  <p className="text-xs text-brand-950 truncate font-mono">{linkGerado}</p>
                </div>
                <a
                  href={linkGerado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-900 text-white p-2 rounded-lg hover:bg-brand-950 transition shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================= MODAL: GESTÃO DA EQUIPA ================= */}
      {modalEquipeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-100 text-brand-900 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Equipa da Agência</h3>
                  <p className="text-xs text-slate-500">Cadastre e controle os utilizadores que podem gerar orçamentos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelarEdicaoUsuario();
                  setModalEquipeAberto(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarUsuario} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> {usuarioEditandoId ? "Editar Colaborador" : "Novo Colaborador"}
                </span>
                {usuarioEditandoId && (
                  <button
                    type="button"
                    onClick={cancelarEdicaoUsuario}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {erroUsuario && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erroUsuario}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Oliveira"
                    value={novoUsuario.nome}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">E-mail / Login</label>
                  <input
                    type="text"
                    required
                    placeholder="carlos@agencia.com.br"
                    value={novoUsuario.login}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, login: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Senha de Acesso</label>
                  <input
                    type="text"
                    required
                    placeholder="Senha do colaborador"
                    value={novoUsuario.senha}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-900 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Permissão</label>
                  <select
                    value={novoUsuario.permissao}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, permissao: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                  >
                    <option value="usuario">Usuário (Apenas cotações)</option>
                    <option value="gestor">Gestor (Acesso total)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={salvandoUsuario}
                  className="bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  {salvandoUsuario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{salvandoUsuario ? "A salvar..." : usuarioEditandoId ? "Atualizar Colaborador" : "Adicionar Colaborador"}</span>
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-slate-600 block">Colaboradores Registados</span>

              {carregandoEquipe ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-900" />
                </div>
              ) : usuariosEquipe.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Nenhum utilizador registado ainda nesta agência. Use o formulário acima para convidar o primeiro membro.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {usuariosEquipe.map((u) => {
                    const isBloqueado = u.status === "bloqueado";
                    const senhaVisivel = mostrarSenhasEquipe[u.id];

                    return (
                      <div key={u.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{u.nome}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              u.permissao === "gestor" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {u.permissao === "gestor" ? "Gestor" : "Usuário"}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isBloqueado ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isBloqueado ? "Bloqueado" : "Ativo"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Login: <strong className="text-slate-700">{u.login}</strong></span>
                            <span className="flex items-center gap-1">
                              Senha: 
                              <strong className="text-slate-700 font-mono">
                                {senhaVisivel ? u.senha : "••••••••"}
                              </strong>
                              <button
                                type="button"
                                onClick={() => alternarMostrarSenhaEquipe(u.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title={senhaVisivel ? "Ocultar senha" : "Ver senha"}
                              >
                                {senhaVisivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoUsuario(u)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="Editar colaborador"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => alternarStatusUsuario(u.id, u.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              isBloqueado
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                            title={isBloqueado ? "Ativar utilizador" : "Bloquear utilizador"}
                          >
                            {isBloqueado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            <span>{isBloqueado ? "Ativar" : "Bloquear"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => excluirUsuarioEquipe(u.id, u.nome)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir colaborador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE ALERTA E CONFIRMAÇÃO ================= */}
      {modalConfig.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                modalConfig.tipo === "confirm" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
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

export default function FastOrcamento() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-900" />
      </div>
    }>
      <GeradorOrcamentoConteudo />
    </Suspense>
  );
}
