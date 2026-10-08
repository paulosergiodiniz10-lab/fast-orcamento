"use client";

import React, { useState } from "react";
import { Building2, Lock, User, Loader2, AlertCircle } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const q = query(
        collection(db, "agencias"),
        where("usuario", "==", usuario.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErro("Utilizador ou agência não encontrados.");
        setCarregando(false);
        return;
      }

      let agenciaValida = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.senha === senha.trim()) {
          agenciaValida = { id: doc.id, ...data };
        }
      });

      if (!agenciaValida) {
        setErro("Senha incorreta. Solicite a sua senha ao suporte.");
        setCarregando(false);
        return;
      }

      if (agenciaValida.status === "bloqueado") {
        setErro("Acesso suspenso. Contacte o administrador.");
        setCarregando(false);
        return;
      }

      localStorage.setItem("fast_agencia", JSON.stringify(agenciaValida));
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setErro("Erro ao ligar ao servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex bg-brand-900 text-white p-3 rounded-2xl mb-3 shadow">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Fast Orçamento</h1>
          <p className="text-xs text-slate-500 mt-1">Acesso exclusivo para agências credenciadas</p>
        </div>

        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Utilizador / Login</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="o seu utilizador"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-brand-900 hover:bg-brand-950 text-white font-bold py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{carregando ? "A entrar..." : "Entrar no Sistema"}</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-6">
          Esqueceu-se da senha? Peça o reenvio diretamente ao suporte via WhatsApp.
        </p>
      </div>
    </div>
  );
}
