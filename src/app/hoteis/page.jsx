"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Plus, Pencil, Trash2, ArrowLeft, Loader2, 
  MapPin, Video, UploadCloud, X, BedDouble, CheckCircle2, Bold, Eraser,
  HelpCircle, AlertCircle, Waves
} from "lucide-react";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";

const CLOUD_NAME = "qi6dleli";
const UPLOAD_PRESET = "fast_orcamento";

// Formatação ortográfica padrão: Primeira letra Maiúscula e o resto minúsculo
const formatarTituloOrtografico = (texto) => {
  if (!texto) return "Parques que inclui no pacote";
  const limpo = texto.trim();
  if (limpo.length === 0) return "Parques que inclui no pacote";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

const comprimirImagem = (file, maxLargura = 1920, maxAltura = 1080, qualidade = 0.82) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const isPng = file.type === "image/png";
    const formatoSaida = isPng ? "image/png" : "image/jpeg";

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let largura = img.width;
        let altura = img.height;

        if (largura > maxLargura || altura > maxAltura) {
          if (largura / altura > maxLargura / maxAltura) {
            altura = Math.round((altura * maxLargura) / largura);
            largura = maxLargura;
          } else {
            largura = Math.round((largura * maxAltura) / altura);
            altura = maxAltura;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, largura, altura);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const extensao = isPng ? ".png" : ".jpg";
            const novoArquivo = new File([blob], file.name.replace(/\.[^/.]+$/, extensao), {
              type: formatoSaida,
              lastModified: Date.now(),
            });
            resolve(novoArquivo);
          },
          formatoSaida,
          qualidade
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

function EditorToolbar({ editorRef }) {
  const [corAtual, setCorAtual] = useState("#1d4ed8");

  const aplicarNegrito = () => {
    document.execCommand("bold", false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  const aplicarCor = (cor) => {
    setCorAtual(cor);
    document.execCommand("foreColor", false, cor);
    if (editorRef.current) editorRef.current.focus();
  };

  const limparFormatacao = () => {
    document.execCommand("removeFormat", false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 px-2 py-1 rounded-lg w-fit mb-1.5 shadow-sm">
      <button
        type="button"
        onClick={aplicarNegrito}
        className="p-1 hover:bg-slate-200 rounded font-bold text-slate-800 text-xs flex items-center justify-center w-6 h-6 transition"
        title="Negrito (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-slate-300 mx-0.5" />

      <button
        type="button"
        onClick={() => aplicarCor("#0f172a")}
        className="w-4 h-4 rounded-full bg-slate-900 border border-slate-400"
        title="Grafite Escuro (Padrão)"
      />
      <button
        type="button"
        onClick={() => aplicarCor("#1d4ed8")}
        className="w-4 h-4 rounded-full bg-blue-700 border border-slate-400"
        title="Azul Destaque"
      />
      <button
        type="button"
        onClick={() => aplicarCor("#ea580c")}
        className="w-4 h-4 rounded-full bg-orange-600 border border-slate-400"
        title="Laranja Chamativo"
      />

      <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded transition ml-1" title="Cor personalizada">
        <span className="font-extrabold text-[11px]" style={{ color: corAtual }}>A</span>
        <input
          type="color"
          value={corAtual}
          onChange={(e) => aplicarCor(e.target.value)}
          className="hidden"
        />
      </label>

      <div className="h-4 w-px bg-slate-300 mx-0.5" />

      <button
        type="button"
        onClick={limparFormatacao}
        className="p-1 hover:bg-slate-200 rounded text-slate-600 text-xs flex items-center justify-center w-6 h-6 transition"
        title="Limpar formatação suja"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function GestaoHoteis() {
  const [agencia, setAgencia] = useState(null);
  const [hoteis, setHoteis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [enviandoFotoGeral, setEnviandoFotoGeral] = useState(false);
  const [enviandoFotoParque, setEnviandoFotoParque] = useState(false);
  const [enviandoFotoAptoIndex, setEnviandoFotoAptoIndex] = useState(null);

  const [modoVisualizacao, setModoVisualizacao] = useState("lista");
  const [hotelEditandoId, setHotelEditandoId] = useState(null);

  // Campos do Formulário
  const [nome, setNome] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [checkinHora, setCheckinHora] = useState("14:00");
  const [checkoutHora, setCheckoutHora] = useState("11:00");
  const [formaPagamentoPadrao, setFormaPagamentoPadrao] = useState("Cartão em até 10x sem juros ou PIX com desconto especial");
  const [tituloInclusoPacote, setTituloInclusoPacote] = useState("Parques que inclui no pacote");
  const [inclusoPacote, setInclusoPacote] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [fotosGerais, setFotosGerais] = useState([]);
  const [tiposApto, setTiposApto] = useState([]);

  // Bloco: Parques Aquáticos / Lazer Adicional
  const [tituloFotosParque, setTituloFotosParque] = useState("Fotos dos Parques Aquáticos");
  const [fotosParque, setFotosParque] = useState([]);
  const [tituloVideoParque, setTituloVideoParque] = useState("Vídeo dos Parques Aquáticos");
  const [videoParqueUrl, setVideoParqueUrl] = useState("");

  // Modal Customizado
  const [modalConfig, setModalConfig] = useState({
    aberto: false,
    tipo: "success",
    titulo: "",
    mensagem: "",
    onConfirm: null,
  });

  const abrirModal = (tipo, titulo, mensagem, onConfirm = null) => {
    setModalConfig({
      aberto: true,
      tipo,
      titulo,
      mensagem,
      onConfirm,
    });
  };

  const fecharModal = () => {
    setModalConfig((prev) => ({ ...prev, aberto: false }));
  };

  const descRef = useRef(null);
  const obsRef = useRef(null);

  const handlePasteLimpo = (e) => {
    e.preventDefault();
    const textoLimpo = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, textoLimpo);
  };

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

  const uploadParaCloudinary = async (fileOriginal) => {
    const arquivoComprimido = await comprimirImagem(fileOriginal);

    const formData = new FormData();
    formData.append("file", arquivoComprimido);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Falha no upload da imagem");
    }
    return data.secure_url;
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEnviandoLogo(true);
    try {
      const url = await uploadParaCloudinary(file);
      setLogoUrl(url);
    } catch {
      abrirModal("error", "Erro no Upload", "Não foi possível enviar o logo. Tente novamente.");
    } finally {
      setEnviandoLogo(false);
      e.target.value = "";
    }
  };

  const handleUploadFotosGerais = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setEnviandoFotoGeral(true);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadParaCloudinary(file);
        urls.push(url);
      }
      setFotosGerais((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Erro no upload geral:", err);
      abrirModal("error", "Falha no Upload", err.message || "Tente novamente.");
    } finally {
      setEnviandoFotoGeral(false);
      e.target.value = "";
    }
  };

  const removerFotoGeral = (idx) => {
    setFotosGerais((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadFotosParque = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setEnviandoFotoParque(true);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadParaCloudinary(file);
        urls.push(url);
      }
      setFotosParque((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Erro no upload dos parques:", err);
      abrirModal("error", "Falha no Upload", err.message || "Tente novamente.");
    } finally {
      setEnviandoFotoParque(false);
      e.target.value = "";
    }
  };

  const removerFotoParque = (idx) => {
    setFotosParque((prev) => prev.filter((_, i) => i !== idx));
  };

  const adicionarTipoApto = () => {
    setTiposApto((prev) => [...prev, { nome: "", fotos: [] }]);
  };

  const atualizarNomeApto = (index, novoNome) => {
    setTiposApto((prev) => {
      const lista = [...prev];
      lista[index] = { ...lista[index], nome: novoNome };
      return lista;
    });
  };

  const removerTipoApto = (index) => {
    setTiposApto((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFotosApto = async (index, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setEnviandoFotoAptoIndex(index);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadParaCloudinary(file);
        urls.push(url);
      }

      setTiposApto((prev) => {
        const lista = [...prev];
        lista[index] = {
          ...lista[index],
          fotos: [...(lista[index].fotos || []), ...urls],
        };
        return lista;
      });
    } catch (err) {
      console.error("Erro no upload do apto:", err);
      abrirModal("error", "Falha no Upload", err.message || "Tente novamente.");
    } finally {
      setEnviandoFotoAptoIndex(null);
      e.target.value = "";
    }
  };

  const removerFotoApto = (aptoIndex, fotoIndex) => {
    setTiposApto((prev) => {
      const lista = [...prev];
      lista[aptoIndex] = {
        ...lista[aptoIndex],
        fotos: (lista[aptoIndex].fotos || []).filter((_, i) => i !== fotoIndex),
      };
      return lista;
    });
  };

  const abrirNovoHotel = () => {
    setHotelEditandoId(null);
    setNome("");
    setLogoUrl("");
    setLocalizacao("");
    setCheckinHora("14:00");
    setCheckoutHora("11:00");
    setFormaPagamentoPadrao("Cartão em até 10x sem juros ou PIX com desconto especial");
    setTituloInclusoPacote("Parques que inclui no pacote");
    setInclusoPacote("");
    setVideoUrl("");
    setFotosGerais([]);
    setTiposApto([]);
    setTituloFotosParque("Fotos dos Parques Aquáticos");
    setFotosParque([]);
    setTituloVideoParque("Vídeo dos Parques Aquáticos");
    setVideoParqueUrl("");

    setTimeout(() => {
      if (descRef.current) descRef.current.innerHTML = "";
      if (obsRef.current) obsRef.current.innerHTML = "";
    }, 50);

    setModoVisualizacao("formulario");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const iniciarEdicao = (hotel) => {
    setHotelEditandoId(hotel.id);
    setNome(hotel.nome || "");
    setLogoUrl(hotel.logoUrl || "");
    setLocalizacao(hotel.localizacao || "");
    setCheckinHora(hotel.checkinHora || "14:00");
    setCheckoutHora(hotel.checkoutHora || "11:00");
    setFormaPagamentoPadrao(hotel.formaPagamento || "Cartão em até 10x sem juros ou PIX com desconto especial");
    setTituloInclusoPacote(hotel.tituloInclusoPacote || "Parques que inclui no pacote");
    setInclusoPacote((hotel.parquesDisponiveis || []).join(", "));
    setVideoUrl(hotel.videoUrl || "");
    setFotosGerais(hotel.fotos || []);
    setTiposApto(hotel.tiposApto || []);
    setTituloFotosParque(hotel.tituloFotosParque || "Fotos dos Parques Aquáticos");
    setFotosParque(hotel.fotosParque || []);
    setTituloVideoParque(hotel.tituloVideoParque || "Vídeo dos Parques Aquáticos");
    setVideoParqueUrl(hotel.videoParqueUrl || "");

    setTimeout(() => {
      if (descRef.current) descRef.current.innerHTML = hotel.descricao || "";
      if (obsRef.current) obsRef.current.innerHTML = hotel.observacoes || "";
    }, 50);

    setModoVisualizacao("formulario");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setModoVisualizacao("lista");
    setHotelEditandoId(null);
  };

  const salvarHotel = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !agencia) return;

    setSalvando(true);
    try {
      const listaIncluso = inclusoPacote
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const dados = {
        agenciaId: agencyIdSafe(agencia.id),
        nome: nome.trim(),
        logoUrl: logoUrl.trim(),
        localizacao: localizacao.trim(),
        checkinHora: checkinHora.trim(),
        checkoutHora: checkoutHora.trim(),
        formaPagamento: formaPagamentoPadrao.trim(),
        descricao: descRef.current ? descRef.current.innerHTML : "",
        tituloInclusoPacote: formatarTituloOrtografico(tituloInclusoPacote),
        parquesDisponiveis: listaIncluso,
        observacoes: obsRef.current ? obsRef.current.innerHTML : "",
        videoUrl: videoUrl.trim(),
        fotos: fotosGerais,
        tiposApto: tiposApto.filter((a) => a.nome && a.nome.trim().length > 0),
        tituloFotosParque: tituloFotosParque.trim() || "Fotos dos Parques Aquáticos",
        fotosParque: fotosParque,
        tituloVideoParque: tituloVideoParque.trim() || "Vídeo dos Parques Aquáticos",
        videoParqueUrl: videoParqueUrl.trim(),
      };

      if (hotelEditandoId) {
        await updateDoc(doc(db, "hoteis", hotelEditandoId), {
          ...dados,
          atualizadoEm: serverTimestamp(),
        });
        abrirModal("success", "Sucesso!", "Hotel atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "hoteis"), {
          ...dados,
          criadoEm: serverTimestamp(),
        });
        abrirModal("success", "Sucesso!", "Hotel cadastrado com sucesso!");
      }

      setModoVisualizacao("lista");
      carregarHoteis(agencia.id);
    } catch {
      abrirModal("error", "Erro ao Salvar", "Não foi possível gravar os dados do hotel.");
    } finally {
      setSalvando(false);
    }
  };

  const agencyIdSafe = (id) => id || "";

  const executarExclusaoHotel = async (id) => {
    try {
      await deleteDoc(doc(db, "hoteis", id));
      setHoteis((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
      abrirModal("error", "Erro ao Excluir", "Não foi possível excluir o hotel.");
    }
  };

  const excluirHotel = (id, nomeHotel) => {
    abrirModal(
      "confirm",
      "Excluir Hotel",
      `Deseja realmente remover o hotel ${nomeHotel}? Esta ação não poderá ser desfeita.`,
      () => executarExclusaoHotel(id)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans relative">
      <header className="bg-brand-900 text-white px-4 md:px-8 py-4 shadow sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-brand-800 hover:bg-brand-700 transition text-white"
            title="Voltar ao Gerador"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight">Gestão de Hotéis / Resorts / Flats</h1>
            <p className="text-xs text-brand-100">{agencia?.nome || "Painel da Agência"}</p>
          </div>
        </div>

        {modoVisualizacao === "lista" && (
          <button
            onClick={abrirNovoHotel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Hotel</span>
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-2">
        {modoVisualizacao === "lista" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Hotéis Cadastrados ({hoteis.length})
              </h2>
            </div>

            {carregando ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-brand-900 mx-auto mb-2" />
                <p className="text-sm text-slate-500">A carregar hotéis da sua agência...</p>
              </div>
            ) : hoteis.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">Nenhum hotel cadastrado ainda</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
                  Cadastre os seus hotéis e resorts com fotos, logotipo, tipos de apartamento e benefícios.
                </p>
                <button
                  onClick={abrirNovoHotel}
                  className="inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Hotel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hoteis.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {h.fotos?.[0] ? (
                        <div className="h-44 w-full relative bg-slate-100 overflow-hidden">
                          <img
                            src={h.fotos[0]}
                            alt={h.nome}
                            className="w-full h-full object-cover"
                          />
                          {h.logoUrl && (
                            <div className="absolute top-2 left-2 bg-white/95 p-1 rounded-lg shadow-md max-w-[70px] max-h-[40px] flex items-center justify-center">
                              <img src={h.logoUrl} alt="Logo" className="max-h-8 max-w-full object-contain" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                            {h.fotos?.length || 0} fotos
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          Sem foto de capa
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-base text-slate-900">{h.nome}</h3>
                        {h.localizacao && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {h.localizacao}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {h.tiposApto?.length > 0 && (
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <BedDouble className="w-3 h-3" />
                              {h.tiposApto.length} tipo(s) de apto
                            </span>
                          )}
                          {h.fotosParque?.length > 0 && (
                            <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Waves className="w-3 h-3 text-sky-600" />
                              {h.fotosParque.length} fotos do parque
                            </span>
                          )}
                          {(h.videoParqueUrl || h.videoUrl) && (
                            <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Video className="w-3 h-3" /> Vídeo ativo
                            </span>
                          )}
                          {h.parquesDisponiveis?.length > 0 && (
                            <span className="bg-brand-50 text-brand-900 border border-brand-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              {h.parquesDisponiveis.length} item(ns) inclusos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                      <button
                        onClick={() => iniciarEdicao(h)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-600" />
                        Editar
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
        )}

        {modoVisualizacao === "formulario" && (
          <form onSubmit={salvarHotel} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-700" />
                {hotelEditandoId ? "Editar Informações do Hotel" : "Cadastrar Novo Hotel / Resort"}
              </h2>
              <button
                type="button"
                onClick={cancelarEdicao}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <X className="w-4 h-4" />
                Voltar à Lista
              </button>
            </div>

            {/* 1. INFORMAÇÕES BÁSICAS */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Nome do Hotel / Resort / Flat *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: HOTEL DIROMA FIORI"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Logotipo do Hotel / Resort (PNG transparente ou JPG)
                    </label>
                    <p className="text-[11px] text-slate-500">Aparecerá no banner principal da proposta.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      <div className="h-12 w-20 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center relative group">
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow"
                          title="Remover logo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <label className={`cursor-pointer inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm ${enviandoLogo ? "opacity-50 pointer-events-none" : ""}`}>
                      {enviandoLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 text-brand-700" />}
                      <span>{enviandoLogo ? "Enviando..." : logoUrl ? "Trocar Logo" : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Localização / Endereço <span className="text-emerald-700 font-semibold">[Mostrar somente no site]</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Santo Amaro, Bairro Turista 1 - Caldas Novas, GO"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Horário Padrão de Check-in
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 14:00"
                    value={checkinHora}
                    onChange={(e) => setCheckinHora(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Horário Padrão de Check-out
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11:00"
                    value={checkoutHora}
                    onChange={(e) => setCheckoutHora(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Forma de Pagamento Padrão
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cartão em até 10x sem juros ou PIX com desconto especial"
                    value={formaPagamentoPadrao}
                    onChange={(e) => setFormaPagamentoPadrao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Sobre o Hotel <span className="text-emerald-700 font-semibold">[Mostrar somente no site]</span>
                    </label>
                    <EditorToolbar editorRef={descRef} />
                  </div>
                  <div
                    ref={descRef}
                    contentEditable
                    onPaste={handlePasteLimpo}
                    className="w-full min-h-[170px] max-h-[320px] overflow-y-auto bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed shadow-inner"
                    placeholder="Cole ou digite a descrição do hotel. Títulos podem ser selecionados e destacados em negrito."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Ao colar, formatações externas são higienizadas para garantir alinhamento limpo.</p>
                </div>
              </div>
            </div>

            {/* 2. INCLUSÕES & MÍDIA */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Inclusões, Mídia & Observações</h3>

              {/* TÍTULO EDITÁVEL DAS INCLUSÕES */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Título das Inclusões (Orçamento WhatsApp e Vitrine)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Parques que inclui no pacote (ou 'Inclui no pacote', 'Benefícios inclusos')"
                  value={tituloInclusoPacote}
                  onChange={(e) => setTituloInclusoPacote(e.target.value)}
                  onBlur={(e) => setTituloInclusoPacote(formatarTituloOrtografico(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajustado automaticamente com a primeira letra maiúscula e as demais minúsculas.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Itens Inclusos no Pacote (Separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clube Privê, Water Park, Náutico Praia Clube, Wi-Fi grátis"
                  value={inclusoPacote}
                  onChange={(e) => setInclusoPacote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Link de Vídeo Principal do Hotel (YouTube normal ou Shorts vertical) <span className="text-emerald-700 font-semibold">[Mostrar somente no site]</span>
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Ex: https://www.youtube.com/watch?v=... ou https://youtube.com/shorts/..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Observações Gerais (Políticas de toalhas, pulseiras, cancelamento) <span className="text-emerald-700 font-semibold">[Mostrar somente no site]</span>
                  </label>
                  <EditorToolbar editorRef={obsRef} />
                </div>
                <div
                  ref={obsRef}
                  contentEditable
                  onPaste={handlePasteLimpo}
                  className="w-full min-h-[160px] max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed shadow-inner"
                  placeholder="Ex: Taxa de turismo inclusa. Proibido entrada com alimentos na área de piscinas."
                />
              </div>
            </div>

            {/* 3. FOTOS GERAIS DO HOTEL */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    Fotos Gerais do Hotel / Lazer <span className="text-emerald-700 text-xs font-semibold">[Mostrar somente no site]</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">Faça upload de fotos das piscinas do hotel, fachada, restaurante e área externa.</p>
                </div>
                
                <label className={`cursor-pointer inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0 ${enviandoFotoGeral ? "opacity-50 pointer-events-none" : ""}`}>
                  {enviandoFotoGeral ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>{enviandoFotoGeral ? "Enviando imagens..." : "Adicionar Fotos"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadFotosGerais}
                    className="hidden"
                  />
                </label>
              </div>

              {fotosGerais.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Nenhuma foto geral adicionada.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Selecione fotos direto do seu celular ou computador.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {fotosGerais.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                      <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removerFotoGeral(idx)}
                        className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 group-hover:opacity-100 transition shadow"
                        title="Remover foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. TIPOS DE APARTAMENTOS */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    Tipos de Apartamentos (Acomodações) <span className="text-emerald-700 text-xs font-semibold">[Mostrar somente no site]</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cadastre os quartos disponíveis e adicione fotos de cada categoria.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={adicionarTipoApto}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Tipo de Apto
                </button>
              </div>

              {tiposApto.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50">
                  <BedDouble className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Nenhum tipo de apartamento cadastrado.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ex: Suíte Luxo Casal, Flat 1 Quarto, Apartamento Standard.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tiposApto.map((apto, index) => (
                    <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                            Nome da Categoria #{index + 1}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Suíte Master com Varanda"
                            value={apto.nome}
                            onChange={(e) => atualizarNomeApto(index, e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removerTipoApto(index)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition self-end"
                          title="Remover categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Fotos deste apartamento ({apto.fotos?.length || 0})
                          </span>

                          <label className={`cursor-pointer inline-flex items-center gap-1.5 text-brand-900 hover:text-brand-950 bg-white border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm ${enviandoFotoAptoIndex === index ? "opacity-50 pointer-events-none" : ""}`}>
                            {enviandoFotoAptoIndex === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                            <span>{enviandoFotoAptoIndex === index ? "Enviando..." : "Fotos do Quarto"}</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleUploadFotosApto(index, e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {apto.fotos?.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                            {apto.fotos.map((fotoUrl, fIdx) => (
                              <div key={fIdx} className="relative group rounded-lg overflow-hidden aspect-video bg-slate-200">
                                <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removerFotoApto(index, fIdx)}
                                  className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 group-hover:opacity-100 transition shadow"
                                  title="Remover foto"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. PARQUES AQUÁTICOS / LAZER ADICIONAL */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Waves className="w-5 h-5 text-sky-600" />
                    Parques Aquáticos / Lazer Adicional <span className="text-emerald-700 text-xs font-semibold">[Mostrar somente no site]</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Fotos e vídeo dos parques aquáticos inclusos no pacote. Se vazios, os blocos não aparecerão na vitrine.
                  </p>
                </div>
                
                <label className={`cursor-pointer inline-flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0 ${enviandoFotoParque ? "opacity-50 pointer-events-none" : ""}`}>
                  {enviandoFotoParque ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>{enviandoFotoParque ? "Enviando imagens..." : "Adicionar Fotos do Parque"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadFotosParque}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Título Editável do Bloco de Fotos */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Título da Seção de Parques (Aparecerá como cabeçalho do slide na vitrine)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fotos do Water Park & Clube Privê (ou 'Fotos do Hot Park')"
                  value={tituloFotosParque}
                  onChange={(e) => setTituloFotosParque(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900 font-semibold text-slate-900"
                />
              </div>

              {/* Grid com as fotos do Parque */}
              {fotosParque.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50">
                  <Waves className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Nenhuma foto de parque adicionada.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Se este produto inclui parque aquático, adicione fotos das atrações aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {fotosParque.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                      <img src={url} alt={`Foto Parque ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removerFotoParque(idx)}
                        className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 group-hover:opacity-100 transition shadow"
                        title="Remover foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bloco de Vídeo dos Parques Aquáticos */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Título do Vídeo do Parque (Editável)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Conheça as atrações do Water Park"
                      value={tituloVideoParque}
                      onChange={(e) => setTituloVideoParque(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Link do Vídeo do Parque (YouTube normal ou Shorts vertical)
                    </label>
                    <div className="relative">
                      <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Ex: https://www.youtube.com/watch?v=... ou https://youtube.com/shorts/..."
                        value={videoParqueUrl}
                        onChange={(e) => setVideoParqueUrl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-9 pr-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Se preenchido, esse vídeo será exibido imediatamente abaixo das fotos dos parques aquáticos na proposta.
                </p>
              </div>
            </div>

            {/* Ações Finais */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelarEdicao}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="bg-brand-900 hover:bg-brand-950 text-white font-bold px-8 py-3 rounded-xl text-sm transition shadow flex items-center gap-2 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{salvando ? "Salvando Hotel..." : hotelEditandoId ? "Atualizar Hotel" : "Gravar Hotel Completo"}</span>
              </button>
            </div>
          </form>
        )}
      </main>

      {/* ================= MODAL ESTILIZADO DE SUCESSO / CONFIRMAÇÃO / ERRO ================= */}
      {modalConfig.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                modalConfig.tipo === "success" 
                  ? "bg-emerald-100 text-emerald-700" 
                  : modalConfig.tipo === "confirm"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {modalConfig.tipo === "success" && <CheckCircle2 className="w-6 h-6" />}
                {modalConfig.tipo === "confirm" && <HelpCircle className="w-6 h-6" />}
                {modalConfig.tipo === "error" && <AlertCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {modalConfig.titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Fast Orçamento</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {modalConfig.mensagem}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {modalConfig.tipo === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      fecharModal();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow"
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-900 hover:bg-brand-950 transition shadow"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
