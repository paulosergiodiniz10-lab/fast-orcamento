"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, MessageSquare, Building2, ExternalLink, Loader2, Hotel, LogOut, BedDouble, Baby } from "lucide-react";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const REGIMES_OPCOES = [
  { id: "sem_refeicao", label: "Sem refeições", emoji: "🏠" },
  { id: "cafe", label: "Café da Manhã", emoji: "☕" },
  { id: "cafe_almoco", label: "Café + Almoço", emoji: "🥗" },
  { id: "cafe_jantar", label: "Café + Jantar", emoji: "🍽️" },
  { id: "pensao_completa", label: "Pensão Completa", emoji: "🍲" },
];

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

export default function FastOrcamento() {
  const hojeStr = obterDataHojeLocal();

  const [agencia, setAgencia] = useState(null);
  const [hoteis, setHoteis] = useState([]);
  const [hotelSelecionado, setHotelSelecionado] = useState(null);
  const [aptoSelecionado, setAptoSelecionado] = useState("");

  const [checkin, setCheckin] = useState(hojeStr);
  const [checkout, setCheckout] = useState(somarDias(hojeStr, 1));
  const [adultos, setAdultos] = useState("2");
  const [criancas, setCriancas] = useState("0");
  const [idadesCriancas, setIdadesCriancas] = useState("");
  const [parquesMarcados, setParquesMarcados] = useState([]);

  const [regimesValores, setRegimesValores] = useState({});
  const [formaPagamento, setFormaPagamento] = useState("Cartão em até 10x sem juros ou PIX com desconto especial");
  const [aptosRestantes, setAptosRestantes] = useState("2");

  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState("");

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
      const q = query(collection(db, "hoteis"), where("agenciaId", "==", agenciaId));
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));

      if (lista.length > 0) {
        setHoteis(lista);
        selecionarHotel(lista[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar hotéis:", err);
    }
  };

  const selecionarHotel = (hotel) => {
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
    const hotel = hoteis.find((h) => h.id === e.target.value);
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

  const formatarDatas = () => {
    if (!checkin || !checkout) return "";
    const [anoIn, mesIn, diaIn] = checkin.split("-");
    const [anoOut, mesOut, diaOut] = checkout.split("-");
    return `${diaIn}/${mesIn} a ${diaOut}/${mesOut}/${anoOut}`;
  };

  const numCriancas = parseInt(criancas, 10) || 0;

  const gerarTextoZap = (urlVitrine) => {
    if (!hotelSelecionado) return "Selecione uma hospedagem para gerar a prévia.";

    let texto = `🏨 *${hotelSelecionado.nome}*\n`;
    texto += `📅 *Período:* ${formatarDatas()}\n`;

    let textoHospedes = `${adultos} adulto(s)`;
    if (numCriancas > 0) {
      textoHospedes += ` e ${numCriancas} criança(s)`;
      if (idadesCriancas.trim()) {
        textoHospedes += ` (${idadesCriancas.trim()})`;
      }
    }
    texto += `👥 *Hóspedes:* ${textoHospedes}\n`;

    if (aptoSelecionado) {
      texto += `🛏️ *Acomodação:* ${aptoSelecionado}\n`;
    }

    texto += `\n`;

    if (parquesMarcados.length > 0) {
      texto += `🎟️ *Incluso no pacote:*\n`;
      parquesMarcados.forEach((p) => {
        texto += `👉 ${p}\n`;
      });
      texto += `\n`;
    }

    const regimesComValor = REGIMES_OPCOES.filter(
      (r) => regimesValores[r.id] && regimesValores[r.id].trim() !== ""
    );

    if (regimesComValor.length > 0) {
      texto += `💰 *Valor total do pacote:*\n`;
      regimesComValor.forEach((reg) => {
        texto += `${reg.emoji} *${reg.label}:* R$ ${regimesValores[reg.id]}\n`;
      });
    }

    if (formaPagamento) {
      texto += `\n💳 *Formas de Pagamento:*\n${formaPagamento}\n`;
    }

    if (aptosRestantes) {
      texto += `\n⚠️ *Restam apenas ${aptosRestantes} apartamentos disponíveis!*\n`;
    }

    const finalUrl = urlVitrine || linkGerado || (typeof window !== "undefined" ? window.location.origin : "");
    if (finalUrl) {
      texto += `\n🔗 *Fotos e detalhes completos:* ${finalUrl}\n`;
    }
    texto += `\n_Oferta sujeita a alteração e disponibilidade sem prévio aviso._`;

    return texto;
  };

  const salvarEGerarLink = async () => {
    if (!hotelSelecionado) {
      alert("Por favor, selecione uma hospedagem primeiro.");
      return;
    }

    try {
      setSalvando(true);

      let hospedesFormatado = `${adultos} Adulto(s)`;
      if (numCriancas > 0) {
        hospedesFormatado += ` e ${numCriancas} Criança(s)`;
        if (idadesCriancas.trim()) {
          hospedesFormatado += ` (${idadesCriancas.trim()})`;
        }
      }

      const dadosOrcamento = {
        agenciaId: agencia?.id || "avulso",
        hotel: {
          nome: hotelSelecionado.nome,
          logoUrl: hotelSelecionado.logoUrl || "", // Repassa o logotipo para a vitrine
          localizacao: hotelSelecionado.localizacao || "",
          descricao: hotelSelecionado.descricao || "",
          observacoes: hotelSelecionado.observacoes || "",
          checkinHora: hotelSelecionado.checkinHora || "14:00",
          checkoutHora: hotelSelecionado.checkoutHora || "11:00",
          videoUrl: hotelSelecionado.videoUrl || "",
          fotos: hotelSelecionado.fotos || [],
          tiposApto: hotelSelecionado.tiposApto || [],
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
        hospedes: hospedesFormatado,
        parques: parquesMarcados,
        regimes: REGIMES_OPCOES.filter((r) => regimesValores[r.id] && regimesValores[r.id].trim() !== "").map((r) => ({
          id: r.id,
          nome: r.label,
          emoji: r.emoji,
          valor: regimesValores[r.id],
        })),
        formaPagamento,
        aptosRestantes,
        criadoEm: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orcamentos"), dadosOrcamento);
      const urlCompleta = `${window.location.origin}/o/${docRef.id}`;
      setLinkGerado(urlCompleta);

      const textoFinal = gerarTextoZap(urlCompleta);
      navigator.clipboard.writeText(textoFinal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);

      return urlCompleta;
    } catch (err) {
      console.error("Erro ao salvar orçamento:", err);
      alert("Erro ao conectar com Firebase. Verifique sua conexão.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
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
            href="/hoteis"
            className="flex items-center gap-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            <Hotel className="w-4 h-4" />
            <span className="hidden sm:inline">Meus Hotéis</span>
          </Link>

          <button
            onClick={salvarEGerarLink}
            disabled={salvando || !hotelSelecionado}
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
          {/* ESCOLHA SUA HOSPEDAGEM */}
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
                {hoteis.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nome}
                  </option>
                ))}
              </select>
            )}

            {/* SELEÇÃO DO TIPO DE APARTAMENTO */}
            {hotelSelecionado?.tiposApto?.length > 0 && (
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

          {/* DATAS E HÓSPEDES COM CAMPO CONDICIONAL DE IDADES DE CRIANÇAS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
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

            {/* CAMPO CONDICIONAL: APARECE SOMENTE QUANDO CRIANÇAS > 0 */}
            {numCriancas > 0 && (
              <div className="pt-2 border-t border-slate-100 animate-fadeIn">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-1">
                  <Baby className="w-3.5 h-3.5 text-brand-700" />
                  Idades / Detalhes das Crianças
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5, 8 e 11 anos (ou '1 bebê de 8 meses e 1 de 6 anos')"
                  value={idadesCriancas}
                  onChange={(e) => setIdadesCriancas(e.target.value)}
                  className="w-full bg-amber-50/60 border border-amber-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Esta informação será adicionada ao texto do WhatsApp e ao card de hóspedes da vitrine.
                </p>
              </div>
            )}
          </div>

          {/* PARQUES E BENEFÍCIOS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Parques e Benefícios
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
              <p className="text-xs text-slate-400 italic">Nenhum parque ou benefício cadastrado para esta hospedagem.</p>
            )}
          </div>

          {/* REGIMES E VALORES ZERADOS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Regimes de Pensão e Valores (R$)
            </label>
            {REGIMES_OPCOES.map((reg) => (
              <div key={reg.id} className="flex items-center gap-2">
                <span className="w-8 text-center text-lg">{reg.emoji}</span>
                <span className="text-xs font-medium text-slate-700 w-36 truncate">{reg.label}</span>
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

          {/* APTOS RESTANTES E FORMA DE PAGAMENTO */}
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

        {/* PRÉVIA DO WHATSAPP */}
        <div className="md:sticky md:top-20 h-fit space-y-3">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <span className="text-xs font-bold uppercase text-brand-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-700" />
                Prévia do WhatsApp
              </span>
              <button
                onClick={salvarEGerarLink}
                disabled={salvando || !hotelSelecionado}
                className="bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow disabled:opacity-50"
              >
                {salvando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiado ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {salvando ? "Salvando..." : copiado ? "Copiado!" : "Salvar e Copiar"}
              </button>
            </div>

            <div className="bg-[#f0f4f2] p-4 rounded-lg font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-200">
              {gerarTextoZap()}
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
    </div>
  );
}
