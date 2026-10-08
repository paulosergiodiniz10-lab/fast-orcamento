"use client";

import React, { useState } from "react";
import { Copy, Check, MessageSquare, Building2, ExternalLink, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const HOTEIS_EXEMPLO = [
  {
    id: "1",
    nome: "HOTEL PRIVE RIVIERA PARK",
    localizacao: "Bairro do Turista, Centro - Caldas Novas, GO",
    parquesDisponiveis: ["Clube Water Park", "Clube Prive", "Clube Náutico", "Clube Kawana"],
    fotos: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    ]
  },
  {
    id: "2",
    nome: "RESORT DO LAGO",
    localizacao: "Às margens do Lago Corumbá - Caldas Novas, GO",
    parquesDisponiveis: ["Clube Water Park", "Clube Prive", "Clube Náutico"],
    fotos: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80"
    ]
  }
];

const REGIMES_OPCOES = [
  { id: "sem_refeicao", label: "Sem refeições", emoji: "🏠" },
  { id: "cafe", label: "Café da Manhã", emoji: "☕" },
  { id: "cafe_almoco", label: "Café + Almoço", emoji: "🥗" },
  { id: "cafe_jantar", label: "Café + Jantar", emoji: "🍽️" },
  { id: "pensao_completa", label: "Pensão Completa", emoji: "🍲" },
];

export default function FastOrcamento() {
  const [hotelSelecionado, setHotelSelecionado] = useState(HOTEIS_EXEMPLO[0]);
  const [checkin, setCheckin] = useState("2026-11-05");
  const [checkout, setCheckout] = useState("2026-11-09");
  const [adultos, setAdultos] = useState("2");
  const [criancas, setCriancas] = useState("0");
  const [parquesMarcados, setParquesMarcados] = useState(hotelSelecionado.parquesDisponiveis);
  
  const [regimesValores, setRegimesValores] = useState({
    cafe: "1.571,61",
    cafe_jantar: "1.951,67",
    pensao_completa: "2.336,94"
  });

  const [formaPagamento, setFormaPagamento] = useState("Cartão em até 10x sem juros ou PIX com desconto especial");
  const [aptosRestantes, setAptosRestantes] = useState("2");
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState("");

  const handleHotelChange = (e) => {
    const hotel = HOTEIS_EXEMPLO.find((h) => h.id === e.target.value);
    if (hotel) {
      setHotelSelecionado(hotel);
      setParquesMarcados(hotel.parquesDisponiveis);
    }
  };

  const toggleParque = (parque) => {
    setParquesMarcados((prev) =>
      prev.includes(parque) ? prev.filter((p) => p !== parque) : [...prev, parque]
    );
  };

  const handleValorChange = (regimeId, valor) => {
    setRegimesValores((prev) => ({ ...prev, [regimeId]: valor }));
  };

  const formatarDatas = () => {
    if (!checkin || !checkout) return "";
    const [anoIn, mesIn, diaIn] = checkin.split("-");
    const [anoOut, mesOut, diaOut] = checkout.split("-");
    return `${diaIn}/${mesIn} a ${diaOut}/${mesOut}/${anoOut}`;
  };

  const gerarTextoZap = (urlVitrine) => {
    let texto = `🏨 *${hotelSelecionado.nome}*\n`;
    texto += `📍 *Local:* ${hotelSelecionado.localizacao}\n`;
    texto += `📅 *Período:* ${formatarDatas()}\n`;
    texto += `👥 *Hóspedes:* ${adultos} adulto(s)${criancas > 0 ? ` e ${criancas} criança(s)` : ""}\n\n`;

    if (parquesMarcados.length > 0) {
      texto += `🎟️ *Parques inclusos no pacote:*\n`;
      parquesMarcados.forEach((p) => {
        texto += `👉 ${p}\n`;
      });
      texto += `\n`;
    }

    texto += `💰 *Valor total do pacote:*\n`;
    REGIMES_OPCOES.forEach((reg) => {
      const valor = regimesValores[reg.id];
      if (valor && valor.trim() !== "") {
        texto += `${reg.emoji} *${reg.label}:* R$ ${valor}\n`;
      }
    });

    if (formaPagamento) {
      texto += `\n💳 *Formas de Pagamento:*\n${formaPagamento}\n`;
    }

    if (aptosRestantes) {
      texto += `\n⚠️ *Restam apenas ${aptosRestantes} apartamentos disponíveis!*\n`;
    }

    const finalUrl = urlVitrine || linkGerado || "https://fast-orcamento.vercel.app";
    texto += `\n🔗 *Fotos e detalhes completos:* ${finalUrl}\n`;
    texto += `\n_Oferta sujeita a alteração e disponibilidade sem prévio aviso._`;

    return texto;
  };

  const salvarEGerarLink = async () => {
    try {
      setSalvando(true);

      const dadosOrcamento = {
        hotel: {
          nome: hotelSelecionado.nome,
          localizacao: hotelSelecionado.localizacao,
          fotos: hotelSelecionado.fotos || [],
        },
        agencia: {
          nome: "Caldas Novas Viagens",
          whatsapp: "5564999999999",
          cidade: "Caldas Novas - GO",
          cadastur: "Regular / Ativo",
        },
        checkin,
        checkout,
        periodoFormatado: formatarDatas(),
        adultos,
        criancas,
        hospedes: `${adultos} Adulto(s)${criancas > 0 ? ` e ${criancas} Criança(s)` : ""}`,
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
      console.error("Erro ao salvar:", err);
      alert("Erro ao conectar com Firebase. Verifique o console.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="bg-brand-900 text-white px-4 py-4 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-brand-700 p-2 rounded-lg text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide">Fast Orçamento</h1>
            <p className="text-xs text-brand-100">Gerador Ágil para WhatsApp</p>
          </div>
        </div>
        <button
          onClick={salvarEGerarLink}
          disabled={salvando}
          className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition disabled:opacity-50"
        >
          {salvando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : copiado ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>{salvando ? "Gerando..." : copiado ? "Copiado c/ Link!" : "Gerar e Copiar"}</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Hotel Cadastrado
            </label>
            <select
              value={hotelSelecionado.id}
              onChange={handleHotelChange}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-900 outline-none"
            >
              {HOTEIS_EXEMPLO.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Check-in</label>
              <input
                type="date"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Check-out</label>
              <input
                type="date"
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Adultos</label>
              <input
                type="number"
                min="1"
                value={adultos}
                onChange={(e) => setAdultos(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Crianças</label>
              <input
                type="number"
                min="0"
                value={criancas}
                onChange={(e) => setCriancas(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Parques e Benefícios
            </label>
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
                        ? "bg-brand-50 border-brand-700 text-brand-900"
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
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Regimes de Pensão e Valores (R$)
            </label>
            {REGIMES_OPCOES.map((reg) => (
              <div key={reg.id} className="flex items-center gap-2">
                <span className="w-8 text-center text-lg">{reg.emoji}</span>
                <span className="text-xs font-medium text-slate-700 w-36 truncate">{reg.label}</span>
                <input
                  type="text"
                  placeholder="Ex: 1.571,61"
                  value={regimesValores[reg.id] || ""}
                  onChange={(e) => handleValorChange(reg.id, e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-brand-900 outline-none"
                />
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Aptos Disponíveis</label>
              <input
                type="text"
                value={aptosRestantes}
                onChange={(e) => setAptosRestantes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Forma de Pagamento</label>
              <input
                type="text"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="md:sticky md:top-20 h-fit space-y-3">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <span className="text-xs font-bold uppercase text-brand-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-700" />
                Prévia do WhatsApp
              </span>
              <button
                onClick={salvarEGerarLink}
                disabled={salvando}
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
