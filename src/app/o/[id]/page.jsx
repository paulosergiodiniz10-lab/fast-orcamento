"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Building2, MapPin, Calendar, Users, CheckCircle2, 
  MessageCircle, Loader2, BedDouble, ShieldCheck, Video, 
  Clock, AlertTriangle, CreditCard, ChevronLeft, ChevronRight, Waves 
} from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Converte links normais, Shorts ou encurtados do YouTube e identifica orientação
const obterDadosVideoYouTube = (url) => {
  if (!url) return null;
  try {
    let id = "";
    let isVertical = false;

    if (url.includes("youtube.com/shorts/")) {
      id = url.split("youtube.com/shorts/")[1].split("?")[0].split("/")[0];
      isVertical = true;
    } else if (url.includes("youtu.be/")) {
      id = url.split("youtu.be/")[1].split("?")[0].split("/")[0];
    } else if (url.includes("watch?v=")) {
      id = url.split("watch?v=")[1].split("&")[0];
    }

    if (!id) return null;
    return {
      embedUrl: `https://www.youtube.com/embed/${id}`,
      isVertical,
    };
  } catch {
    return null;
  }
};

export default function VitrineOrcamento() {
  const params = useParams();
  const idParam = params?.id;

  const [orcamento, setOrcamento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Sliders
  const [fotoGeralIndex, setFotoGeralIndex] = useState(0);
  const [fotoParqueIndex, setFotoParqueIndex] = useState(0);
  const [indicesApto, setIndicesApto] = useState({});

  useEffect(() => {
    if (!idParam) return;

    const carregarOrcamento = async () => {
      try {
        setCarregando(true);
        let dadosEncontrados = null;

        // 1. Tenta buscar direto como ID puro (compatibilidade com links antigos)
        try {
          const docRef = doc(db, "orcamentos", idParam);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            dadosEncontrados = { id: docSnap.id, ...docSnap.data() };
          }
        } catch {
          // Segue para a busca do link amigável
        }

        // 2. Se não achou pelo ID direto, trata como link limpo (ex: hotel-resort-do-lago-gZ4tYg)
        if (!dadosEncontrados) {
          // Extrai o código do final do slug após o último hífen
          const partes = idParam.split("-");
          const codigoFim = partes[partes.length - 1];

          const snapTodos = await getDocs(collection(db, "orcamentos"));
          snapTodos.forEach((d) => {
            // Verifica se o ID do documento começa com o código do link
            if (!dadosEncontrados && (d.id.startsWith(codigoFim) || d.id === idParam)) {
              dadosEncontrados = { id: d.id, ...d.data() };
            }
          });
        }

        if (dadosEncontrados) {
          // Fallback inteligente: se o orçamento salvo não tiver fotosParque, busca no cadastro atual do hotel
          if (
            (!dadosEncontrados.hotel?.fotosParque || dadosEncontrados.hotel.fotosParque.length === 0) &&
            dadosEncontrados.hotel?.nome
          ) {
            try {
              const qHotel = query(
                collection(db, "hoteis"),
                where("nome", "==", dadosEncontrados.hotel.nome)
              );
              const snapH = await getDocs(qHotel);
              if (!snapH.empty) {
                const dadosHotelAtual = snapH.docs[0].data();
                if (dadosHotelAtual.fotosParque && dadosHotelAtual.fotosParque.length > 0) {
                  dadosEncontrados.hotel.fotosParque = dadosHotelAtual.fotosParque;
                  dadosEncontrados.hotel.tituloFotosParque =
                    dadosHotelAtual.tituloFotosParque || "Fotos dos Parques Aquáticos";
                }
              }
            } catch (errHotel) {
              console.warn("Aviso ao buscar dados extras do hotel:", errHotel);
            }
          }

          setOrcamento(dadosEncontrados);
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
  }, [idParam]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400 mb-3" />
        <p className="text-sm font-semibold tracking-wide">Carregando proposta personalizada...</p>
      </div>
    );
  }

  if (erro || !orcamento) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
        <div className="bg-white/10 p-4 rounded-2xl mb-3">
          <Building2 className="w-10 h-10 text-sky-400" />
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
    apartamentosGrupo,
    tipoOrcamento,
    formaPagamento, 
    aptosRestantes, 
    acomodacaoEscolhida 
  } = orcamento;

  const isGrupo = tipoOrcamento === "grupos" || (apartamentosGrupo && apartamentosGrupo.length > 0);

  const whatsNumeros = (agencia?.whatsapp || "").replace(/\D/g, "");
  const whatsappFormatado = whatsNumeros.startsWith("55") ? whatsNumeros : `55${whatsNumeros}`;

  const mensagemReserva = encodeURIComponent(
    `Olá, ${agencia?.nome || "Agência"}! Vi a proposta do *${hotel?.nome}* para o período *${periodoFormatado}* ${isGrupo ? `(Grupo com ${apartamentosGrupo?.length || 0} apartamentos)` : ""} e gostaria de reservar!`
  );

  const linkWhatsApp = `https://wa.me/${whatsappFormatado}?text=${mensagemReserva}`;

  const fotosGerais = hotel?.fotos || [];
  const fotosParque = hotel?.fotosParque || [];
  const tituloParque = hotel?.tituloFotosParque || "Fotos dos Parques Aquáticos";
  const videoInfo = obterDadosVideoYouTube(hotel?.videoUrl);

  // Mapeia todos os tipos de apartamentos ÚNICOS que foram cotados
  const tiposAptoCadastrados = hotel?.tiposApto || [];
  let nomesAptosCotados = [];

  if (isGrupo) {
    nomesAptosCotados = Array.from(
      new Set(
        apartamentosGrupo
          .map((a) => a.acomodacao)
          .filter((nome) => Boolean(nome && nome.trim().length > 0))
      )
    );
  } else if (acomodacaoEscolhida) {
    nomesAptosCotados = [acomodacaoEscolhida];
  }

  // Lista com dados e fotos de cada categoria cotada (sem duplicidades)
  const categoriasAptoExibir = nomesAptosCotados
    .map((nomeApto) => tiposAptoCadastrados.find((t) => t.nome === nomeApto))
    .filter((obj) => Boolean(obj && obj.fotos && obj.fotos.length > 0));

  // Navegação no slider geral do hotel
  const proximaFotoGeral = () => {
    if (fotosGerais.length > 0) setFotoGeralIndex((prev) => (prev + 1) % fotosGerais.length);
  };
  const fotoAnteriorGeral = () => {
    if (fotosGerais.length > 0) setFotoGeralIndex((prev) => (prev - 1 + fotosGerais.length) % fotosGerais.length);
  };

  // Navegação no slider dos parques aquáticos
  const proximaFotoParque = () => {
    if (fotosParque.length > 0) setFotoParqueIndex((prev) => (prev + 1) % fotosParque.length);
  };
  const fotoAnteriorParque = () => {
    if (fotosParque.length > 0) setFotoParqueIndex((prev) => (prev - 1 + fotosParque.length) % fotosParque.length);
  };

  // Navegação para sliders de acomodações
  const mudarFotoApto = (nomeApto, novoIndex) => {
    setIndicesApto((prev) => ({ ...prev, [nomeApto]: novoIndex }));
  };

  const proximaFotoApto = (nomeApto, total) => {
    const atual = indicesApto[nomeApto] || 0;
    mudarFotoApto(nomeApto, (atual + 1) % total);
  };

  const anteriorFotoApto = (nomeApto, total) => {
    const atual = indicesApto[nomeApto] || 0;
    mudarFotoApto(nomeApto, (atual - 1 + total) % total);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-28 font-sans">
      {/* CABEÇALHO AZUL ESCURO NOBRE COM BOTÃO VERDE WHATSAPP */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight tracking-wide text-white">
              {agencia?.nome || "Caldas Novas Viagens"}
            </h1>
            <p className="text-[11px] text-sky-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Proposta Exclusiva • CADASTUR Verificado
            </p>
          </div>
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full transition shadow-md active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar Agora</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5 mt-2">
        {/* ================= 1. CARD PRINCIPAL: AZUL OCEANO COM LOGO DO HOTEL ================= */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 md:p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 pr-2">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-md text-sky-100 inline-block mb-2">
                  {isGrupo ? "Proposta para Grupos / Múltiplos Apartamentos" : "Hospedagem Selecionada"}
                </span>
                <h2 className="text-xl md:text-2xl font-black leading-tight drop-shadow-sm">
                  {hotel?.nome}
                </h2>
                {hotel?.localizacao && (
                  <p className="text-xs text-sky-100 flex items-center gap-1.5 mt-2 font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-300" />
                    {hotel.localizacao}
                  </p>
                )}
              </div>

              {/* LOGO DO HOTEL EM BOX BRANCO */}
              {hotel?.logoUrl && (
                <div className="bg-white p-2 rounded-xl shadow-lg border border-white/80 shrink-0 self-start sm:self-center h-16 w-24 md:h-20 md:w-28 flex items-center justify-center">
                  <img
                    src={hotel.logoUrl}
                    alt={`Logo ${hotel.nome}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-4">
            {/* Período, Hóspedes e Acomodação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-blue-100 text-blue-900 p-2.5 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Período</p>
                  <p className="text-xs font-bold text-slate-800">{periodoFormatado}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-blue-100 text-blue-900 p-2.5 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    {isGrupo ? "Estrutura do Grupo" : "Hóspedes"}
                  </p>
                  <p className="text-xs font-bold text-slate-800">{hospedes}</p>
                </div>
              </div>

              {!isGrupo && acomodacaoEscolhida && (
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
                  <Clock className="w-4 h-4 text-blue-700" />
                  Check-in: <strong className="text-slate-900 ml-1">{hotel.checkinHora || "14:00"}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-4 h-4 text-blue-700" />
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
                      className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-xs font-semibold text-blue-950"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TABELAS DE VALORES: GRUPOS VS INDIVIDUAL ================= */}
            {isGrupo ? (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Apartamentos Cotados & Valores
                </h3>
                
                <div className="space-y-3">
                  {apartamentosGrupo?.map((apto, idx) => {
                    const regimesApto = [
                      { id: "sem_refeicao", label: "Sem refeições" },
                      { id: "cafe", label: "Café da Manhã" },
                      { id: "cafe_almoco", label: "Café + Almoço" },
                      { id: "cafe_jantar", label: "Café + Jantar" },
                      { id: "pensao_completa", label: "Pensão Completa" },
                    ].filter((r) => apto.valores && apto.valores[r.id]);

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-bold uppercase bg-brand-900 text-white px-2.5 py-0.5 rounded-md">
                            Apto #{idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {apto.titulo || "02 adultos"}
                          </span>
                          {apto.acomodacao && (
                            <span className="text-[11px] text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-semibold ml-auto">
                              {apto.acomodacao}
                            </span>
                          )}
                        </div>

                        {regimesApto.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {regimesApto.map((reg) => (
                              <div key={reg.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-semibold text-slate-700">{reg.label}</span>
                                <span className="font-extrabold text-blue-950 text-sm">
                                  R$ {apto.valores[reg.id]}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Valores sob consulta para esta unidade.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              regimes && regimes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Valores por Regime de Refeição
                  </h3>
                  <div className="space-y-2">
                    {regimes.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-500 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-800">{r.nome}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-medium block">Total do Pacote</span>
                          <span className="text-sm sm:text-base font-extrabold text-blue-950">
                            R$ {r.valor}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* FORMAS DE PAGAMENTO E AVISO DE VAGAS */}
            <div className="space-y-2 pt-2">
              {formaPagamento && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
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

        {/* ================= 2. SOBRE O HOTEL (BLINDAGEM TIPOGRÁFICA) ================= */}
        {hotel?.descricao && (
          <div className="bg-white rounded-2xl shadow-
