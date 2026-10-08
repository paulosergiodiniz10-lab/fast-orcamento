"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Pencil, Trash2, ArrowLeft, Loader2, Image as ImageIcon, MapPin, Check, X } from "lucide-react";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export default function GestaoHoteis() {
  const [agencia, setAgencia] = useState(null);
  const [hoteis, setHoteis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estado de edição
  const [hotelEditandoId, setHotelEditandoId] = useState(null);

  // Formulário
  const [nome, setNome] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [parquesTexto, setParquesTexto] = useState("");
  const [fotosTexto, setFotosTexto] = useState("");

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("fast_agencia");
    if (!dadosSalvos) {
      window.location.href = "/login";
      return;
    }
    const ag = JSON.parse(dadosSalvos);
    setAgencia(ag);
    carregarHoteis(ag.id);
  }, []);

  const carregarHoteis = async (agenciaId) => {
    try {
      setCarregando(true);
      const q = query(collection(db, "hoteis"), where("agenciaId", "==", agenciaId));
      const snap = await getDocs(q);
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setHoteis(lista);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (hotel) => {
    setHotelEditandoId(hotel.id);
    setNome(hotel.nome || "");
    setLocalizacao(hotel.localizacao || "");
    setParquesTexto((hotel.parquesDisponiveis || []).join(", "));
    setFotosTexto((hotel.fotos || []).join("\n"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setHotelEditandoId(null);
    setNome("");
    setLocalizacao("");
    setParquesTexto("");
    setFotosTexto("");
  };

  const salvarHotel = async (e) => {
    e.preventDefault();
    if (!nome || !agencia) return;

    setSalvando(true);
    try {
      const listaParques = parquesTexto
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const listaFotos = fotosTexto
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const dados = {
        agenciaId: agencia.id,
        nome: nome.trim(),
        localizacao: localizacao.trim(),
        parquesDisponiveis: listaParques,
        fotos: listaFotos,
      };

      if (hotelEditandoId) {
        await updateDoc(doc(db, "hoteis", hotelEditandoId), {
          ...dados,
          atualizadoEm: serverTimestamp(),
        });
        alert("Hotel atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "hoteis"), {
          ...dados,
          criadoEm: serverTimestamp(),
        });
        alert("Hotel cadastrado com sucesso!");
      }

      cancelarEdicao();
      carregarHoteis(agencia.id);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar o hotel.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirHotel = async (id, nomeHotel) => {
    if (!confirm(`Deseja realmente remover o hotel ${nomeHotel}?`)) return;
    try {
      await deleteDoc(doc(db, "hoteis", id));
      if (hotelEditandoId === id) cancelarEdicao();
      setHoteis((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="bg-brand-900 text-white px-4 py-4 shadow sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-brand-800 hover:bg-brand-700 transition text-white"
            title="Voltar ao Gerador"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base leading-tight">Meus Hotéis e Resorts</h1>
            <p className="text-xs text-brand-100">{agencia?.nome || "Painel da Agência"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário de Criação/Edição */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {hotelEditandoId ? (
                <>
                  <Pencil className="w-4 h-4 text-amber-600" />
                  Editar Hotel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-brand-700" />
                  Novo Hotel
                </>
              )}
            </h2>
            {hotelEditandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Cancelar edição"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={salvarHotel} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Nome do Hotel / Resort
              </label>
              <input
                type="text"
                required
                placeholder="Ex: HOTEL DIROMA FIORI"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Localização / Endereço
              </label>
              <input
                type="text"
                placeholder="Ex: Bairro Turista 1 - Caldas Novas, GO"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Parques Inclusos (separados por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: Acqua Park Splash, Splash Kids"
                value={parquesTexto}
                onChange={(e) => setParquesTexto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-brand-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">Separe cada parque usando vírgula.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Links das Fotos (1 por linha)
              </label>
              <textarea
                rows={4}
                placeholder="https://exemplo.com/foto1.jpg&#10;https://exemplo.com/foto2.jpg"
                value={fotosTexto}
                onChange={(e) => setFotosTexto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-brand-900 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Cole URLs de imagens públicas (WebP, JPG, PNG).</p>
            </div>

            <div className="flex gap-2 pt-1">
              {hotelEditandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 text-white ${
                  hotelEditandoId
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-brand-900 hover:bg-brand-950"
                }`}
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : hotelEditandoId ? (
                  <Pencil className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>
                  {salvando
                    ? "Gravando..."
                    : hotelEditandoId
                    ? "Guardar Alterações"
                    : "Registar Hotel"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Hotéis Cadastrados */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">
            Hotéis Cadastrados ({hoteis.length})
          </h2>

          {carregando ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-brand-900 mx-auto mb-2" />
              <p className="text-xs text-slate-500">A carregar os seus hotéis...</p>
            </div>
          ) : hoteis.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Ainda não registou nenhum hotel ou resort.</p>
              <p className="text-[11px] text-slate-400 mt-1">Preencha o formulário ao lado para cadastrar o primeiro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hoteis.map((h) => (
                <div
                  key={h.id}
                  className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition ${
                    hotelEditandoId === h.id
                      ? "border-amber-400 ring-2 ring-amber-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <span className="font-bold text-sm text-slate-900 block">{h.nome}</span>
                    {h.localizacao && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {h.localizacao}
                      </p>
                    )}

                    {h.parquesDisponiveis?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {h.parquesDisponiveis.map((pq, idx) => (
                          <span
                            key={idx}
                            className="bg-brand-50 text-brand-900 text-[10px] font-medium px-2 py-0.5 rounded-md border border-brand-100"
                          >
                            {pq}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {h.fotos?.length || 0} foto(s) configurada(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <button
                      onClick={() => iniciarEdicao(h)}
                      className="p-1.5 text-slate-500 hover:text-amber-700 rounded-lg hover:bg-amber-50 border border-slate-200 transition"
                      title="Editar hotel"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => excluirHotel(h.id, h.nome)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Excluir hotel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
