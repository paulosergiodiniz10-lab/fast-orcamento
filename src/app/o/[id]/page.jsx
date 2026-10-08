"use client";

import React, { useState } from "react";
import { MessageCircle, CheckCircle, MapPin, Calendar, Users, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

// Dados simulados da proposta (depois serão carregados via Firebase pelo ID)
const DADOS_PROPOSTA = {
  agencia: {
    nome: "Caldas Novas Viagens",
    whatsapp: "5564999999999",
    cidade: "Caldas Novas - GO",
    cadastur: "Regular / Ativo",
  },
  hotel: {
    nome: "HOTEL PRIVE RIVIERA PARK",
    localizacao: "Bairro do Turista, Centro - Caldas Novas, GO",
    fotos: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    ],
  },
  periodo: "05 a 09/11/2026",
  hospedes: "02 Adultos",
  parques: [
    "Clube Water Park",
    "Clube Prive",
    "Clube Náutico",
    "Clube Kawana",
  ],
  regimes: [
    { nome: "Café da Manhã", emoji: "☕", valor: "1.571,61", destaque: false },
    { nome: "Meia Pensão (Café + Jantar)", emoji: "🍽️", valor: "1.951,67", destaque: true },
    { nome: "Pensão Completa", emoji: "🍲", valor: "2.336,94", destaque: false },
  ],
  pagamento: "Cartão em até 10x sem juros ou PIX com desconto especial",
  aptosRestantes: "2",
};

export default function VitrineOrcamento() {
  const [fotoAtual, setFotoAtual] = useState(0);

  const fotos = DADOS_PROPOSTA.hotel.fotos;

  const proximaFoto = () => {
    setFotoAtual((prev) => (prev + 1) % fotos.length);
  };

  const fotoAnterior = () => {
    setFotoAtual((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  const linkWhatsapp = `https://wa.me/${DADOS_PROPOSTA.agencia.whatsapp}?text=${encodeURIComponent(
    `Olá! Estive olhando a proposta do ${DADOS_PROPOSTA.hotel.nome} no período ${DADOS_PROPOSTA.periodo} e gostaria de confirmar a minha reserva!`
  )}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24">
      {/* Topo / Header da Agência */}
      <header className="bg-brand-900 text-white px-4 py-3 shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide">
              {DADOS_PROPOSTA.agencia.nome}
            </h1>
            <p className="text-[11px] text-brand-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Proposta Exclusiva • CADASTUR Verificado
            </p>
          </div>
          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow transition"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Falar Agora
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Carrossel de Fotos */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black aspect-video">
          <img
            src={fotos[fotoAtual]}
            alt="Foto do Hotel"
            className="w-full h-full object-cover transition duration-300"
          />
          {fotos.length > 1 && (
            <>
              <button
                onClick={fotoAnterior}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={proximaFoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 right-3 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                {fotoAtual + 1} / {fotos.length} fotos
              </div>
            </>
          )}
        </div>

        {/* Informações Principais do Hotel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="inline-block bg-brand-50 text-brand-900 border border-brand-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2">
            Hospedagem Selecionada
          </div>
          <h2 className="text-xl font-bold text-slate-900 leading-snug">
            {DADOS_PROPOSTA.hotel.nome}
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-brand-700 shrink-0" />
            {DADOS_PROPOSTA.hotel.localizacao}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-2 rounded-lg text-brand-900">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Período</p>
                <p className="text-xs font-bold text-slate-800">{DADOS_PROPOSTA.periodo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-2 rounded-lg text-brand-900">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Acomodação</p>
                <p className="text-xs font-bold text-slate-800">{DADOS_PROPOSTA.hospedes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ingressos e Parques */}
        {DADOS_PROPOSTA.parques.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              🎟️ Ingressos e Benefícios Inclusos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DADOS_PROPOSTA.parques.map((parque, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50/60 border border-brand-100 text-xs font-medium text-brand-950"
                >
                  <CheckCircle className="w-4 h-4 text-brand-700 shrink-0" />
                  <span>{parque}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opções de Pensão e Valores */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            💰 Valores por Regime de Refeição
          </h3>
          <div className="space-y-2.5">
            {DADOS_PROPOSTA.regimes.map((reg, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                  reg.destaque
                    ? "bg-brand-50/70 border-brand-700 shadow-sm"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{reg.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{reg.nome}</p>
                    {reg.destaque && (
                      <span className="text-[10px] text-brand-800 font-semibold">Mais escolhido</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total do pacote</p>
                  <p className="text-base font-extrabold text-brand-900">R$ {reg.valor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Formas de Pagamento e Urgência */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-600">
              💳 <span className="font-semibold">Pagamento:</span> {DADOS_PROPOSTA.pagamento}
            </p>
            {DADOS_PROPOSTA.aptosRestantes && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2">
                ⚠️ Restam apenas {DADOS_PROPOSTA.aptosRestantes} apartamentos disponíveis nesta tarifa!
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic text-center pt-1">
              *Tarifa sujeita a alteração e confirmação de disponibilidade sem aviso prévio.
            </p>
          </div>
        </div>
      </main>

      {/* Botão Fixo Inferior (CTA Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-2xl mx-auto">
          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-5 h-5" />
            Quero Reservar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
