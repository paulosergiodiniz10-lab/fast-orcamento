"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Building2, MapPin, Calendar, Users, CheckCircle2, 
  MessageCircle, Loader2, BedDouble, ShieldCheck, Video, 
  Clock, AlertTriangle, CreditCard, ChevronLeft, ChevronRight 
} from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Converte links normais, Shorts ou encurtados do YouTube em embed funcional
const formatarEmbedYouTube = (url) => {
  if (!url) return null;
  try {
    if (url.includes("youtube.com/shorts/")) {
      const id = url.split("youtube.com/shorts/")[1].split("?")[0].split("/")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split("?")[0].split("/")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return null;
  }
};

export default function VitrineOrcamento() {
  const params = useParams();
  const id = params?.id;

  const [orcamento, setOrcamento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [fotoGeralIndex, setFotoGeralIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    const carregarOrcamento = async () => {
      try {
        setCarregando(true);
        const docRef = doc(db, "orcamentos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrcamento({ id: docSnap.id, ...docSnap.data() });
        } else {
          setErro(true);
        }
      } catch (err) {
        console.error("Erro ao carregar proposta do Firestore:", err);
        setErro(true);
      } finally {
        setCarregando(false);
      }
    };

    carregarOrcamento();
  }, [id]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-semibold tracking-wide">Carregando proposta personalizada...</p>
      </div>
    );
  }

  if (erro || !orcamento) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
        <div className="bg-white/10 p-4 rounded-2xl mb-3">
          <Building2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold">Proposta não encontrada</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          O link pode estar incorreto ou a proposta expirou.
        </p>
      </div>
    );
  }

  const { 
    hotel, 
    agencia, 
    hospedes, 
    periodoFormatado, 
    parques, 
    regimes, 
    formaPagamento, 
    aptosRestantes, 
    acomodacaoEscolhida 
  } = orcamento;

  // WhatsApp dinâmico da agência cadastrada
  const whatsNumeros = (agencia?.whatsapp || "").replace(/\D/g, "");
  const whatsappFormatado = whatsNumeros.startsWith("55") ? whatsNumeros : `55${whatsNumeros}`;

  const mensagemReserva = encodeURIComponent(
    `Olá, ${agencia?.nome || "Agência"}! Vi a proposta do *${hotel?.nome}* para o período *${periodoFormatado}* e gostaria de reservar!`
  );

  const linkWhatsApp = `https://wa.me/${whatsappFormatado}?text=${mensagemReserva}`;

  // Fotos gerais e da acomodação selecionada
  const fotosGerais = hotel?.fotos || [];
  const aptoCotadoDados = (hotel?.tiposApto || []).find((a) => a.nome === acomodacaoEscolhida);
  const fotosApto = aptoCotadoDados?.fotos || [];
  const videoEmbedUrl = formatarEmbedYouTube(hotel?.videoUrl);

  const proximaFoto = () => {
    if (fotosGerais.length > 0) {
      setFotoGeralIndex((prev) => (prev + 1) % fotosGerais.length);
    }
  };

  const fotoAnterior = () => {
    if (fotosGerais.length > 0) {
      setFotoGeralIndex((prev) => (prev - 1 + fotosGerais.length) % fotosGerais.length);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-28">
      {/* CABEÇALHO COM BOTÃO "FALAR AGORA" DINÂMICO */}
      <header className="bg-emerald-950 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">{agencia?.nome || "Caldas Novas Viagens"}</h1>
            <p className="text-[11px] text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Proposta Exclusiva • CADASTUR Verificado
            </p>
          </div>
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-full transition shadow"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar Agora</span>
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-2">
        {/* ================= 1. CARD PRINCIPAL: DETALHES E VALORES DO ORÇAMENTO ================= */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-900 text-white p-5">
            <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-800/80 px-2.5 py-1 rounded-md">
              Hospedagem Selecionada
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold mt-2 leading-tight">{hotel?.nome}</h2>
            {hotel?.localizacao && (
              <p className="text-xs text-emerald-200 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 shrink-0 text-emerald-300" />
                {hotel.localizacao}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Período, Hóspedes e Acomodação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-900 p-2.5 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Período</p>
                  <p className="text-xs font-bold text-slate-800">{periodoFormatado}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-900 p-2.5 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Hóspedes</p>
                  <p className="text-xs font-bold text-slate-800">{hospedes}</p>
                </div>
              </div>

              {acomodacaoEscolhida && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3 sm:col-span-2">
                  <div className="bg-amber-100 text-amber-900 p-2.5 rounded-lg">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tipo de Acomodação</p>
                    <p className="text-xs font-bold text-slate-800">{acomodacaoEscolhida}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Horários de Check-in e Check-out */}
            {(hotel?.checkinHora || hotel?.checkoutHora) && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Check-in: <strong className="text-slate-900 ml-1">{hotel.checkinHora || "14:00"}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Check-out: <strong className="text-slate-900 ml-1">{hotel.checkoutHora || "11:00"}</strong>
                </span>
              </div>
            )}

            {/* Inclusões e Benefícios */}
            {parques && parques.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Incluso no Pacote
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parques.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl text-xs font-semibold text-emerald-950"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABELA DE VALORES POR REGIME DE REFEIÇÃO */}
            {regimes && regimes.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Valores por Regime de Refeição
                </h3>
                <div className="space-y-2">
                  {regimes.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-emerald-500 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{r.emoji || "🍽️"}</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{r.nome}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">Total do Pacote</span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-950">
                          R$ {r.valor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FORMAS DE PAGAMENTO E AVISO DE VAGAS DINÂMICOS */}
            <div className="space-y-2 pt-2">
              {formaPagamento && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Formas de Pagamento:</span>
                    <span>{formaPagamento}</span>
                  </div>
                </div>
              )}

              {aptosRestantes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Restam apenas <strong>{aptosRestantes} apartamento(s)</strong> disponíveis nesta tarifa!
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center italic pt-1">
              * Tarifa sujeita a alteração e confirmação de disponibilidade sem aviso prévio.
            </p>
          </div>
        </div>

        {/* ================= 2. SOBRE O HOTEL (TEXTO RICO) ================= */}
        {hotel?.descricao && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sobre a Estrutura do Hotel
            </h3>
            <div
              className="text-xs md:text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: hotel.descricao }}
            />
          </div>
        )}

        {/* ================= 3. FOTOS DA ACOMODAÇÃO SELECIONADA ================= */}
        {fotosApto.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Fotos de: {acomodacaoEscolhida}</h3>
                <p className="text-[11px] text-slate-500">Imagens da acomodação incluída na sua proposta</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {fotosApto.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                  <img src={url} alt={`Foto Apto ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 4. GALERIA GERAL DE FOTOS ================= */}
        {fotosGerais.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Fotos do Hotel & Lazer</h3>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
              <img
                src={fotosGerais[fotoGeralIndex]}
                alt="Foto do Hotel"
                className="w-full h-full object-cover transition duration-300"
              />

              {fotosGerais.length > 1 && (
                <>
                  <button
                    onClick={fotoAnterior}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={proximaFoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                    title="Próxima foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                    {fotoGeralIndex + 1} / {fotosGerais.length} fotos
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {fotosGerais.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setFotoGeralIndex(idx)}
                  className={`aspect-video rounded-lg overflow-hidden border-2 transition ${
                    fotoGeralIndex === idx ? "border-emerald-600 scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. VÍDEO DO HOTEL (YOUTUBE) ================= */}
        {videoEmbedUrl && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-red-600" />
              Vídeo da Hospedagem
            </h3>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow">
              <iframe
                src={videoEmbedUrl}
                title="Vídeo do Hotel"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* ================= 6. OBSERVAÇÕES GERAIS E POLÍTICAS ================= */}
        {hotel?.observacoes && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Observações & Políticas
            </h3>
            <div
              className="text-xs md:text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: hotel.observacoes }}
            />
          </div>
        )}

        {/* RODAPÉ */}
        <footer className="text-center text-xs text-slate-400 pt-2 space-y-1">
          <p className="font-semibold text-slate-600">{agencia?.nome || "Caldas Novas Viagens"}</p>
          {agencia?.cadastur && <p>CADASTUR / CNPJ: {agencia.cadastur}</p>}
          <p className="text-[11px] text-slate-400">Proposta gerada via Fast Orçamento</p>
        </footer>
      </main>

      {/* BOTÃO FIXO INFERIOR COM LINK DO WHATSAPP DA AGÊNCIA */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-2xl mx-auto">
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Quero Reservar no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
