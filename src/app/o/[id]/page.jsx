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
          const partes = idParam.split("-");
          const codigoFim = partes[partes.length - 1];

          const snapTodos = await getDocs(collection(db, "orcamentos"));
          snapTodos.forEach((d) => {
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
      {/* CABEÇALHO */}
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
        {/* ================= 1. CARD PRINCIPAL ================= */}
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
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{r.nome}</span>
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

        {/* ================= 2. SOBRE O HOTEL ================= */}
        {hotel?.descricao && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sobre a Estrutura do Hotel
            </h3>
            <div
              className="text-xs md:text-sm leading-relaxed space-y-2.5 font-normal break-words text-slate-900 [&_*]:!text-slate-900 [&_*]:!font-sans [&_strong]:!font-bold [&_h2]:!text-base [&_h2]:!font-bold [&_h2]:!text-slate-900 [&_h3]:!text-sm [&_h3]:!font-bold [&_h3]:!text-slate-900"
              dangerouslySetInnerHTML={{ __html: hotel.descricao }}
            />
          </div>
        )}

        {/* ================= 3. FOTOS DOS APARTAMENTOS ================= */}
        {categoriasAptoExibir.length > 0 && (
          <div className="space-y-4">
            {categoriasAptoExibir.map((aptoCat) => {
              const fotos = aptoCat.fotos || [];
              const indexFotoAtual = indicesApto[aptoCat.nome] || 0;

              return (
                <div key={aptoCat.nome} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Fotos de: {aptoCat.nome}</h3>
                      <p className="text-[11px] text-slate-500">Imagens da acomodação incluída na sua proposta</p>
                    </div>
                  </div>

                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                    <img
                      src={fotos[indexFotoAtual]}
                      alt={`Foto de ${aptoCat.nome}`}
                      className="w-full h-full object-cover transition duration-300"
                    />

                    {fotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => anteriorFotoApto(aptoCat.nome, fotos.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                          title="Foto anterior"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => proximaFotoApto(aptoCat.nome, fotos.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                          title="Próxima foto"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                          {indexFotoAtual + 1} / {fotos.length} fotos
                        </div>
                      </>
                    )}
                  </div>

                  {fotos.length > 1 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                      {fotos.map((url, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          onClick={() => mudarFotoApto(aptoCat.nome, fIdx)}
                          className={`aspect-video rounded-lg overflow-hidden border-2 transition ${
                            indexFotoAtual === fIdx ? "border-amber-600 scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================= 4. FOTOS DO HOTEL & LAZER ================= */}
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
                    onClick={fotoAnteriorGeral}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={proximaFotoGeral}
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

            {fotosGerais.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {fotosGerais.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFotoGeralIndex(idx)}
                    className={`aspect-video rounded-lg overflow-hidden border-2 transition ${
                      fotoGeralIndex === idx ? "border-blue-600 scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= 5. FOTOS DOS PARQUES AQUÁTICOS ================= */}
        {fotosParque.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{tituloParque}</h3>
                <p className="text-[11px] text-slate-500">Atrações e lazer inclusos no seu pacote</p>
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
              <img
                src={fotosParque[fotoParqueIndex]}
                alt={tituloParque}
                className="w-full h-full object-cover transition duration-300"
              />

              {fotosParque.length > 1 && (
                <>
                  <button
                    onClick={fotoAnteriorParque}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={proximaFotoParque}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow"
                    title="Próxima foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                    {fotoParqueIndex + 1} / {fotosParque.length} fotos
                  </div>
                </>
              )}
            </div>

            {fotosParque.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {fotosParque.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFotoParqueIndex(idx)}
                    className={`aspect-video rounded-lg overflow-hidden border-2 transition ${
                      fotoParqueIndex === idx ? "border-sky-600 scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= 6. VÍDEO DO HOTEL ================= */}
        {videoInfo?.embedUrl && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-red-600" />
              Vídeo da Hospedagem
            </h3>

            {videoInfo.isVertical ? (
              <div className="flex justify-center py-2">
                <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-slate-200">
                  <iframe
                    src={videoInfo.embedUrl}
                    title="Vídeo Vertical da Hospedagem"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow">
                <iframe
                  src={videoInfo.embedUrl}
                  title="Vídeo da Hospedagem"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

        {/* ================= 7. OBSERVAÇÕES & POLÍTICAS ================= */}
        {hotel?.observacoes && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Observações & Políticas
            </h3>
            <div
              className="text-xs md:text-sm leading-relaxed space-y-2 text-slate-900 [&_*]:!text-slate-900 [&_strong]:!font-bold"
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

      {/* BOTÃO FIXO INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-3xl mx-auto">
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition active:scale-[0.99]"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Quero Reservar no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
