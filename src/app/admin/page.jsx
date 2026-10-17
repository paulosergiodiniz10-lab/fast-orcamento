"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Key, ShieldCheck, Eye, EyeOff, Loader2, Building, Phone, FileText, Pencil, X, CalendarDays, CheckCircle2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

// Defina aqui a sua senha mestre exclusiva
const SENHA_MASTER = "admin123";

export default function AdminMaster() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [verSenhaMaster, setVerSenhaMaster] = useState(false);
  const [erroLogin, setErroLogin] = useState("");

  const [agencias, setAgencias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // ID da agência em modo de edição (se null, está em modo de criação)
  const [agenciaEditandoId, setAgenciaEditandoId] = useState(null);

  // Formulário de agência
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senhaAgencia, setSenhaAgencia] = useState("");
  const [cadastur, setCadastur] = useState("");
  const [permiteTarifario, setPermiteTarifario] = useState(false);

  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  const fazerLoginMaster = (e) => {
    e.preventDefault();
    if (senhaInput === SENHA_MASTER) {
      setAutenticado(true);
      setErroLogin("");
      carregarAgencias();
    } else {
      setErroLogin("Senha mestre incorreta.");
    }
  };

  const carregarAgencias = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, "agencias"));
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setAgencias(lista);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (ag) => {
    setAgenciaEditandoId(ag.id);
    setNome(ag.nome || "");
    setWhatsapp(ag.whatsapp || "");
    setUsuario(ag.usuario || "");
    setSenhaAgencia(ag.senha || "");
    setCadastur(ag.cadastur || "");
    setPermiteTarifario(Boolean(ag.permiteTarifario));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setAgenciaEditandoId(null);
    setNome("");
    setWhatsapp("");
    setUsuario("");
    setSenhaAgencia("");
    setCadastur("");
    setPermiteTarifario(false);
  };

  const salvarAgencia = async (e) => {
    e.preventDefault();
    if (!nome || !usuario || !senhaAgencia || !whatsapp) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        usuario: usuario.trim().toLowerCase(),
        senha: senhaAgencia.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        cadastur: cadastur.trim() || "Regular / Ativo",
        permiteTarifario: Boolean(permiteTarifario),
      };

      if (agenciaEditandoId) {
        // Atualizar agência existente
        await updateDoc(doc(db, "agencias", agenciaEditandoId), {
          ...dados,
          atualizadoEm: serverTimestamp(),
        });
        alert("Agência atualizada com sucesso!");
      } else {
        // Criar nova agência
        await addDoc(collection(db, "agencias"), {
          ...dados,
          status: "ativo",
          criadoEm: serverTimestamp(),
        });
        alert("Agência cadastrada com sucesso!");
      }

      cancelarEdicao();
      carregarAgencias();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar agência.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarStatus = async (agencia) => {
    const novoStatus = agencia.status === "ativo" ? "bloqueado" : "ativo";
    try {
      await updateDoc(doc(db, "agencias", agencia.id), { status: novoStatus });
      setAgencias((prev) =>
        prev.map((a) => (a.id === agencia.id ? { ...a, status: novoStatus } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Alterna diretamente entre Orçamento Padrão e com Tarifário no card da agência
  const alternarModoTarifario = async (agencia) => {
    const novoValor = !agencia.permiteTarifario;
    try {
      await updateDoc(doc(db, "agencias", agencia.id), { permiteTarifario: novoValor });
      setAgencias((prev) =>
        prev.map((a) => (a.id === agencia.id ? { ...a, permiteTarifario: novoValor } : a))
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar o modo de orçamento.");
    }
  };

  const excluirAgencia = async (id, nomeAgencia) => {
    if (!confirm(`Tem certeza que deseja excluir o acesso da agência ${nomeAgencia}?`)) return;
    try {
      await deleteDoc(doc(db, "agencias", id));
      if (agenciaEditandoId === id) cancelarEdicao();
      setAgencias((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={fazerLoginMaster} className="bg-white max-w-sm w-full rounded-2xl shadow-xl p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 bg-emerald-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Painel Master</h1>
            <p className="text-xs text-slate-500">Acesso restrito ao administrador</p>
          </div>

          {erroLogin && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mb-4 text-center font-semibold">
              {erroLogin}
            </p>
          )}

          <div className="mb-4">
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Senha Mestre</label>
            <div className="relative flex items-center">
              <input
                type={verSenhaMaster ? "text" : "password"}
                required
                placeholder="Digite sua senha..."
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-900"
              />
              <button
                type="button"
                onClick={() => setVerSenhaMaster(!verSenhaMaster)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
              >
                {verSenhaMaster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-2.5 rounded-xl text-sm transition shadow"
          >
            Acessar Controle
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="bg-emerald-950 text-white px-6 py-4 shadow sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="font-bold text-base leading-tight">Painel Master • Fast Orçamento</h1>
            <p className="text-[11px] text-emerald-200">Gerenciador de Clientes e Acessos</p>
          </div>
        </div>
        <button
          onClick={() => setAutenticado(false)}
          className="text-xs bg-emerald-900 hover:bg-emerald-800 px-3 py-1.5 rounded-lg font-semibold transition"
        >
          Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário (Criação / Edição) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {agenciaEditandoId ? (
                <>
                  <Pencil className="w-4 h-4 text-amber-600" />
                  Editar Agência
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-emerald-700" />
                  Cadastrar Nova Agência
                </>
              )}
            </h2>
            {agenciaEditandoId && (
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

          <form onSubmit={salvarAgencia} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da Agência</label>
              <input
                type="text"
                required
                placeholder="Ex: Rio Quente Viagens"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">WhatsApp (com DDD)</label>
              <input
                type="text"
                required
                placeholder="Ex: 64999998888"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Login / Usuário</label>
                <input
                  type="text"
                  required
                  placeholder="rioquente"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Senha</label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={senhaAgencia}
                  onChange={(e) => setSenhaAgencia(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Cadastur ou CNPJ
              </label>
              <input
                type="text"
                placeholder="Ex: digite números ou texto"
                value={cadastur}
                onChange={(e) => setCadastur(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>

            {/* SELEÇÃO DO TIPO DE ORÇAMENTO (PADRÃO OU COM TARIFÁRIO) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-800" />
                Modo de Orçamento da Agência
              </label>
              
              <div className="grid grid-cols-1 gap-1.5">
                <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                  !permiteTarifario ? "bg-slate-100 border-slate-400 font-bold text-slate-900" : "bg-white border-slate-200 text-slate-600"
                }`}>
                  <input
                    type="radio"
                    name="tipoModoOrcamento"
                    checked={!permiteTarifario}
                    onChange={() => setPermiteTarifario(false)}
                    className="accent-slate-800"
                  />
                  <div className="text-[11px]">
                    <span className="block">Orçamento Padrão (Manual)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Digitação manual dos valores</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                  permiteTarifario ? "bg-amber-50 border-amber-500 font-bold text-amber-950" : "bg-white border-slate-200 text-slate-600"
                }`}>
                  <input
                    type="radio"
                    name="tipoModoOrcamento"
                    checked={permiteTarifario}
                    onChange={() => setPermiteTarifario(true)}
                    className="accent-amber-600"
                  />
                  <div className="text-[11px]">
                    <span className="block text-amber-900">Orçamento com Tarifário</span>
                    <span className="text-[10px] text-amber-700 font-normal">Cálculo e descontos automáticos</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {agenciaEditandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 ${
                  agenciaEditandoId
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-900 hover:bg-emerald-950 text-white"
                }`}
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : agenciaEditandoId ? (
                  <Pencil className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>
                  {salvando
                    ? "Salvando..."
                    : agenciaEditandoId
                    ? "Salvar Alterações"
                    : "Cadastrar Agência"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Agências */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-800">
              Agências Cadastradas ({agencias.length})
            </h2>
            <button
              type="button"
              onClick={() => setMostrarSenhas(!mostrarSenhas)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
            >
              {mostrarSenhas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{mostrarSenhas ? "Ocultar Senhas" : "Ver Senhas"}</span>
            </button>
          </div>

          {carregando ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-900 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Buscando agências cadastradas...</p>
            </div>
          ) : agencias.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
              <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma agência credenciada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agencias.map((ag) => (
                <div
                  key={ag.id}
                  className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    agenciaEditandoId === ag.id
                      ? "border-amber-400 ring-2 ring-amber-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{ag.nome}</span>
                      
                      {/* Status Ativo/Bloqueado */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ag.status === "ativo"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ag.status === "ativo" ? "Ativo" : "Bloqueado"}
                      </span>

                      {/* Tag do Modo (Padrão ou Tarifário) com Botão Rápido de 1 Clique */}
                      <button
                        type="button"
                        onClick={() => alternarModoTarifario(ag)}
                        title="Clique para alternar o modo desta agência"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
                          ag.permiteTarifario
                            ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                            : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <CalendarDays className="w-3 h-3" />
                        <span>{ag.permiteTarifario ? "Com Tarifário" : "Padrão"}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {ag.whatsapp}
                      </span>
                      {ag.cadastur && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <FileText className="w-3.5 h-3.5" /> {ag.cadastur}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="text-slate-600">
                        Login: <b className="text-slate-900">{ag.usuario}</b>
                      </span>
                      <span className="text-slate-600 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        Senha:{" "}
                        <b className="font-mono text-emerald-950">
                          {mostrarSenhas ? ag.senha : "••••••"}
                        </b>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => iniciarEdicao(ag)}
                      className="p-1.5 text-slate-500 hover:text-amber-700 rounded-lg hover:bg-amber-50 border border-slate-200 transition"
                      title="Editar agência"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alternarStatus(ag)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                        ag.status === "ativo"
                          ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {ag.status === "ativo" ? "Bloquear" : "Ativar"}
                    </button>
                    <button
                      onClick={() => excluirAgencia(ag.id, ag.nome)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Excluir agência"
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
