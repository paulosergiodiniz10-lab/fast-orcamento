"use client";

import React, { useState } from "react";
import { Building2, Lock, User, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const loginInput = usuario.trim().toLowerCase();
    const senhaInput = senha.trim();

    try {
      let sessaoValida = null;

      // 1. Tenta autenticar primeiro como a Conta Principal da Agência (Gestor Master)
      const qAgencia = query(
        collection(db, "agencias"),
        where("usuario", "==", loginInput)
      );
      const snapAgencia = await getDocs(qAgencia);

      if (!snapAgencia.empty) {
        snapAgencia.forEach((documento) => {
          const data = documento.data();
          if (data.senha === senhaInput) {
            sessaoValida = {
              id: documento.id,
              ...data,
              permissao: "gestor",
              nomeUsuario: data.nome || "Gestor Principal",
              loginUsuario: data.usuario,
              isContaPrincipal: true,
            };
          }
        });

        if (sessaoValida && sessaoValida.status === "bloqueado") {
          setErro("Acesso da agência suspenso. Contacte o administrador.");
          setCarregando(false);
          return;
        }
      }

      // 2. Se não for conta mestra, procura nos Colaboradores das agências (sem travar por falta de índice)
      if (!sessaoValida) {
        const todasAgenciasSnap = await getDocs(collection(db, "agencias"));

        for (const agenciaDoc of todasAgenciasSnap.docs) {
          const subUsuariosRef = collection(db, "agencias", agenciaDoc.id, "usuarios");
          const qSub = query(subUsuariosRef, where("login", "==", loginInput));
          const subSnap = await getDocs(qSub);

          if (!subSnap.empty) {
            const docSub = subSnap.docs[0];
            const dataSub = docSub.data();

            if (dataSub.senha === senhaInput) {
              if (dataSub.status === "bloqueado") {
                setErro("O seu acesso foi bloqueado pela agência.");
                setCarregando(false);
                return;
              }

              const dataAgenciaPai = agenciaDoc.data();
              if (dataAgenciaPai.status === "bloqueado") {
                setErro("Acesso da agência suspenso. Contacte o administrador.");
                setCarregando(false);
                return;
              }

              sessaoValida = {
                id: agenciaDoc.id,
                ...dataAgenciaPai,
                permissao: dataSub.permissao || "usuario",
                nomeUsuario: dataSub.nome || "Colaborador",
                loginUsuario: dataSub.login,
                usuarioId: docSub.id,
                isContaPrincipal: false,
              };
              break;
            }
          }
        }
      }

      if (!sessaoValida) {
        setErro("Utilizador ou senha incorretos.");
        setCarregando(false);
        return;
      }

      // 1. Guarda a sessão completa no localStorage para os componentes de cliente
      localStorage.setItem("fast_agencia", JSON.stringify(sessaoValida));

      // 2. Guarda os dados essenciais num cookie para o middleware.js ler no servidor
      const dadosCookie = {
        id: sessaoValida.id,
        permissao: sessaoValida.permissao || "usuario",
      };
      document.cookie = `fast_agencia_auth=${encodeURIComponent(
        JSON.stringify(dadosCookie)
      )}; path=/; max-age=2592000; SameSite=Lax`;

      window.location.href = "/";
    } catch (err) {
      console.error("Erro na autenticação:", err);
      setErro("Erro ao autenticar. Verifique a sua conexão.");
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
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Utilizador / E-mail
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="seu usuario ou e-mail"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 rounded transition"
                title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
              >
                {mostrarSenha ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
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
          Esqueceu a senha? Solicite à sua agência ou ao administrador.
        </p>
      </div>
    </div>
  );
}
