"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Copy, Check, MessageSquare, Building2, ExternalLink, 
  Loader2, Hotel, LogOut, BedDouble, Baby, User, Phone, FileText,
  Users, Plus, Trash2, CopyPlus, RotateCcw, AlertCircle, HelpCircle,
  Send
} from "lucide-react";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const REGIMES_OPCOES = [
  { id: "sem_refeicao", label: "Sem refeições" },
  { id: "cafe", label: "Café da Manhã" },
  { id: "cafe_almoco", label: "Café + Almoço" },
  { id: "cafe_jantar", label: "Café + Jantar" },
  { id: "pensao_completa", label: "Pensão Completa" },
];

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

function GeradorOrcamentoConteudo() {
  const searchParams = useSearchParams();
  const hojeStr = obterDataHojeLocal();

  const [abaAtiva, setAbaAtiva] = useState(searchParams.get("tipoOrcamento") === "grupos" ? "grupos" : "individual");

  const [agencia, setAgencia] = useState(null);
  const [hoteis, setHoteis] = useState([]);
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
  const [formaPagamento, setFormaPagamento] = useState("Cartão em até 10x sem juros ou PIX com desconto especial");
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
        const hotelNomeUrl = searchParams.get("hotelNome");
        const hotelEncontrado = hotelNomeUrl ? lista.find((h) => h.nome === hotelNomeUrl) : null;
        if (hotelEncontrado) {
          selecionarHotel(hotelEncontrado);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar hotéis:", err);
    }
  };

  const agencyIdSafe = (id) => id || "";

  const selecionarHotel = (hotel) => {
    if (!hotel) {
      setHotelSelecionado(null);
      setParquesMarcados([]);
      setAptoSelecionado("");
      setRegimesValores({});
      return;
    }

    setHotelSelecionado(hotel);
    setParquesMarcados(hotel.parquesDisponiveis || []);
    setAptoSelecionado(hotel.tiposApto?.[0]?.nome || "");
    setRegimesValores({});

    if (hotel.formaPagamento && hotel.formaPagamento.trim() !== "") {
      setFormaPagamento(hotel.formaPagamento);
    } else {
      setFormaPagamento("Cartão em até 10x sem juros ou PIX com desconto especial");
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

  const handleCheckinChange = (e) => {
    const novoCheckin = e.target.value;
    setCheckin(novoCheckin);

    if (!checkout || checkout <= novoCheckin) {
      setCheckout(somarDias(novoCheckin, 1));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fast_agencia");
    window.location.href = "/login";
  };

  const toggleParque = (parque) => {
    setParquesMarcados((prev) =>
      prev.includes(parque) ? prev.filter((p) => p !== parque) : [...prev, parque]
    );
  };

  const formatarMoeda = (valorDigitado) => {
    const apenasNumeros = valorDigitado.replace(/\D/g, "");
    if (!apenasNumeros) return "";

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

  const executarLimpeza = () => {
    setClienteNome("");
    setClienteWhatsapp("");
    setHotelSelecionado(null);
    setAptoSelecionado("");
    setCheckin(hojeStr);
    setCheckout(somarDias(hojeStr, 1));
    setAdultos("2");
    setCriancas("0");
    setIdadesCriancas("");
    setRegimesValores({});
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

  // Montagem limpa e condicional com título dinâmico das inclusões
  const gerarTextoZap = (urlVitrine, idDoc, modo = "copiar") => {
    if (!hotelSelecionado) {
      return "Selecione uma hospedagem para gerar a prévia do orçamento.";
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

    texto += `*Valor total do pacote:*\n\n`;

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

      const regimesComValor = REGIMES_OPCOES.filter(
        (r) => regimesValores[r.id] && regimesValores[r.id].trim() !== ""
      );

      regimesComValor.forEach((reg) => {
        texto += `*${reg.label}:*\nR$ ${regimesValores[reg.id]}\n\n`;
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

        const regimesComValor = REGIMES_OPCOES.filter(
          (r) => ap.valores[r.id] && ap.valores[r.id].trim() !== ""
        );

        if (regimesComValor.length > 0) {
          regimesComValor.forEach((reg) => {
            texto += `${reg.label}\nR$ ${ap.valores[reg.id]}\n\n`;
          });
        } else {
          texto += `_Valores sob consulta_\n\n`;
        }
      });
    }

    if (formaPagamento) {
      texto += `${iconeCartao}*Formas de Pagamento:*\n${formaPagamento}\n\n`;
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

    let hospedesFormatado = `${adultos} Adulto(s)`;
    if (numCriancas > 0) {
      hospedesFormatado += ` e ${numCriancas} Criança(s)`;
      if (idadesCriancas.trim()) {
        hospedesFormatado += ` (${idadesCriancas.trim()})`;
      }
    }

    const apartamentosTratados = apartamentosGrupo.map((ap) => ({
      ...ap,
      titulo: formatarDescricaoHospedes(ap.adultos, ap.criancas, ap.idadesCriancas),
    }));

    const dadosOrcamento = {
      agenciaId: agencia?.id || "avulso",
      tipoOrcamento: abaAtiva,
      clienteNome: clienteNome.trim().toUpperCase() || null,
      clienteWhatsapp: clienteWhatsapp.replace(/\D/g, "") || null,
      hotel: {
        nome: hotelSelecionado.nome,
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
      },
      acomodacaoEscolhida: aptoSelecionado || null,
      agencia: {
        nome: agencia?.nome || "Caldas Novas Viagens",
        whatsapp: agencia?.whatsapp || "",
        cadastur: agencia?.cadastur || "",
      },
      checkin,
      checkout,
      periodoFormatado: formatarDatas(),
      adultos,
      criancas,
      idadesCriancas: numCriancas > 0 ? idadesCriancas.trim() : "",
      hospedes: abaAtiva === "individual" ? hospedesFormatado : `Grupo com ${apartamentosGrupo.length} apartamento(s)`,
      parques: parquesMarcados,
      regimes: REGIMES_OPCOES.filter((r) => regimesValores[r.id] && regimesValores[r.id].trim() !== "").map((r) => ({
        id: r.id,
        nome: r.label,
        valor: regimesValores[r.id],
      })),
      apartamentosGrupo: abaAtiva === "grupos" ? apartamentosTratados : null,
      formaPagamento,
      aptosRestantes,
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
    hotelSelecionado
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans relative">
      <header className="bg-brand-900 text-white px-4 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-700 p-2 rounded-lg text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide">Fast Orçamento</h1>
            <p className="text-[11px] text-brand-100">{agencia?.nome || "Painel da Agência"}</p>
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

          <Link
            href="/hoteis"
            className="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            <Hotel className="w-4 h-4" />
            <span className="hidden sm:inline">Meus Hotéis</span>
          </Link>

          <button
            onClick={salvarEGerarLink}
            disabled={salvando || enviandoZap || !hotelSelecionado}
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

          {/* ================= ESCOLHA SUA HOSPEDAGEM ================= */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Escolha sua Hospedagem
              </label>
              <Link href="/hoteis" className="text-xs text-brand-700 hover:underline font-semibold">
                + Gerenciar
              </Link>
            </div>
            {hoteis.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Nenhuma hospedagem cadastrada.{" "}
                <Link href="/hoteis" className="underline font-bold">
                  Clique aqui para cadastrar a primeira.
                </Link>
              </div>
            ) : (
              <select
                value={hotelSelecionado?.id || ""}
                onChange={handleHotelChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-900 outline-none"
              >
                <option value="">-- Selecione uma hospedagem --</option>
                {hoteis.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nome}
                  </option>
                ))}
              </select>
            )}

            {/* SELEÇÃO DO TIPO DE APARTAMENTO (MODO INDIVIDUAL) */}
            {abaAtiva === "individual" && hotelSelecionado?.tiposApto?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-brand-700" />
                  Tipo de Apartamento Cotado
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAptoSelecionado("")}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                      aptoSelecionado === ""
                        ? "bg-brand-900 text-white border-brand-900 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Nenhum (Geral)
                  </button>
                  {hotelSelecionado.tiposApto.map((ap, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAptoSelecionado(ap.nome)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                        aptoSelecionado === ap.nome
                          ? "bg-brand-900 text-white border-brand-900 font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {ap.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= DATAS ================= */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Check-in</label>
                <input
                  type="date"
                  min={hojeStr}
                  value={checkin}
                  onChange={handleCheckinChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Check-out</label>
                <input
                  type="date"
                  min={somarDias(checkin || hojeStr, 1)}
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          {/* ================= CONTEÚDO DA ABA INDIVIDUAL ================= */}
          {abaAtiva === "individual" && (
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
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-1">
                      <Baby className="w-3.5 h-3.5 text-brand-700" />
                      Idades / Detalhes das Crianças
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: até 12 anos (ou '5 e 9 anos')"
                      value={idadesCriancas}
                      onChange={(e) => setIdadesCriancas(e.target.value)}
                      className="w-full bg-amber-50/60 border border-amber-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Regimes de Pensão e Valores (R$)
                </label>
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

          {/* ================= CONTEÚDO DA ABA GRUPOS ================= */}
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
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 10px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 8px;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: #94a3b8;
                    border-radius: 8px;
                    border: 2px solid #f1f5f9;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                  }
                `}</style>

                {apartamentosGrupo.map((apto, index) => {
                  const numCrApto = parseInt(apto.criancas, 10) || 0;

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

                      <div className="space-y-2">
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
                          <div>
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
                          </div>
                        )}
                      </div>

                      {hotelSelecionado?.tiposApto?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1.5 flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5 text-brand-700" />
                            Tipo de Apartamento deste Quarto:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => atualizarApartamentoGrupo(index, "acomodacao", "")}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                                !apto.acomodacao
                                  ? "bg-brand-900 text-white border-brand-900 font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Geral (Padrão)
                            </button>
                            {hotelSelecionado.tiposApto.map((ap, apIdx) => (
                              <button
                                key={apIdx}
                                type="button"
                                onClick={() => atualizarApartamentoGrupo(index, "acomodacao", ap.nome)}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                                  apto.acomodacao === ap.nome
                                    ? "bg-brand-900 text-white border-brand-900 font-bold"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {ap.nome}
                              </button>
                            ))}
                          </div>
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
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= PARQUES E BENEFÍCIOS ================= */}
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
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Forma de Pagamento</label>
              <input
                type="text"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
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
                  disabled={salvando || enviandoZap || !hotelSelecionado}
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
