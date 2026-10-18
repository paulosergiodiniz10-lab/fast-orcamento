"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Plus, Pencil, Trash2, ArrowLeft, Loader2, 
  MapPin, Video, UploadCloud, X, BedDouble, CheckCircle2, Bold, Eraser,
  HelpCircle, AlertCircle, Waves, Filter, Star, CreditCard, Baby, MessageSquare,
  FileText, Image as ImageIcon, CalendarDays, Tag
} from "lucide-react";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc, writeBatch 
} from "firebase/firestore";

const CLOUD_NAME = "qi6dleli";
const UPLOAD_PRESET = "fast_orcamento";

const DIAS_SEMANA_NOMES = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

const REGIMES_LISTA = [
  { id: "cafe", label: "Café da Manhã" },
  { id: "cafe_almoco", label: "Café + Almoço" },
  { id: "cafe_jantar", label: "Café + Jantar" },
  { id: "pensao_completa", label: "Pensão Completa" },
  { id: "sem_refeicao", label: "Sem refeição" },
];

const PALETA_CORES_TARIFAS = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
];

function obterEstiloTarifa(nomeTarifa) {
  if (!nomeTarifa) return PALETA_CORES_TARIFAS[0];
  let hash = 0;
  for (let i = 0; i < nomeTarifa.length; i++) {
    hash = nomeTarifa.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETA_CORES_TARIFAS.length;
  return PALETA_CORES_TARIFAS[index];
}

const obterDataHojeIso = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const obterDataAmanhaIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

function ToggleSwitch({ ativo, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        ativo ? "bg-emerald-600" : "bg-slate-300"
      }`}
      title={label || (ativo ? "Ativo" : "Inativo")}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          ativo ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const formatarTituloOrtografico = (texto) => {
  if (!texto) return "Parques que inclui no pacote";
  const limpo = texto.trim();
  if (limpo.length === 0) return "Parques que inclui no pacote";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

const formatarNomeCidade = (texto) => {
  if (!texto) return "";
  return texto
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
};

const formatarMoedaInput = (valorDigitado) => {
  const apenasNumeros = String(valorDigitado || "").replace(/\D/g, "");
  if (!apenasNumeros || parseInt(apenasNumeros, 10) === 0) return "";
  const valorFloat = parseFloat(apenasNumeros) / 100;
  return valorFloat.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const converterMoedaParaFloat = (valorStr) => {
  if (!valorStr) return 0;
  const limpo = String(valorStr).replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
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
        title="Limpar formatação"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// =========================================================================
// COMPONENTE: GESTÃO DO CALENDÁRIO COM CORES DISTINTAS E SOBREPOSIÇÃO
// =========================================================================
function TabelaGestaoCalendario({ tarifas = [], tiposApto = [], onEditarTarifa, onExcluirTarifa }) {
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [filtroTarifa, setFiltroTarifa] = useState("todas");
  const [filtroRegime, setFiltroRegime] = useState("todos");
  const [filtroApto, setFiltroApto] = useState("todos");

  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const REGIMES_ROTULOS = {
    cafe: "Café da Manhã",
    cafe_almoco: "Café + Almoço",
    cafe_jantar: "Café + Jantar",
    pensao_completa: "Pensão Completa",
    sem_refeicao: "Sem refeição",
  };

  const limparFiltros = () => {
    setFiltroTarifa("todas");
    setFiltroRegime("todos");
    setFiltroApto("todos");
  };

  const gerarLinhasCalendario = () => {
    const totalDias = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();
    const linhas = [];

    for (let dia = 1; dia <= totalDias; dia++) {
      const dataObj = new Date(anoSelecionado, mesSelecionado, dia);
      const diaSemanaIdx = dataObj.getDay();
      const mesStr = String(mesSelecionado + 1).padStart(2, "0");
      const diaStr = String(dia).padStart(2, "0");
      const dataIso = `${anoSelecionado}-${mesStr}-${diaStr}`;

      const tarifasCompativeis = tarifas.filter((t) => {
        if (!t.ativo) return false;
        const noPeriodo = dataIso >= t.dataInicio && dataIso <= t.dataFim;
        const noDiaSemana = !t.diasSemana || t.diasSemana.includes(diaSemanaIdx);
        return noPeriodo && noDiaSemana;
      });

      if (tarifasCompativeis.length > 0) {
        tarifasCompativeis.sort((a, b) => {
          // Extrai o tempo em segundos/milissegundos com precisão
          const tempoA = a.atualizadoEm?.seconds || a.criadoEm?.seconds || (a.atualizadoEm instanceof Date ? a.atualizadoEm.getTime() / 1000 : 0);
          const tempoB = b.atualizadoEm?.seconds || b.criadoEm?.seconds || (b.atualizadoEm instanceof Date ? b.atualizadoEm.getTime() / 1000 : 0);

          // 1º CRITÉRIO ABSOLUTO: O cadastro/atualização mais recente sempre prevalece
          if (tempoA !== tempoB) {
            return tempoB - tempoA;
          }

          // 2º CRITÉRIO: Exceção diária específica (dataInicio === dataFim)
          const isSingleDayA = a.dataInicio === a.dataFim ? 10 : 0;
          const isSingleDayB = b.dataInicio === b.dataFim ? 10 : 0;
          if (isSingleDayA !== isSingleDayB) {
            return isSingleDayB - isSingleDayA;
          }

          // 3º CRITÉRIO: Vinculação de apartamento específico
          const pesoAptoA = a.aptoVinculado && a.aptoVinculado !== "todos" ? 4 : 0;
          const pesoAptoB = b.aptoVinculado && b.aptoVinculado !== "todos" ? 4 : 0;
          if (pesoAptoA !== pesoAptoB) {
            return pesoAptoB - pesoAptoA;
          }

          // 4º CRITÉRIO: Pacote fechado
          const pesoPacoteA = a.pacoteFechado ? 2 : 0;
          const pesoPacoteB = b.pacoteFechado ? 2 : 0;
          return pesoPacoteB - pesoPacoteA;
        });

        const tarifaVencedora = tarifasCompativeis[0];

        Object.keys(tarifaVencedora.valores || {}).forEach((regId) => {
          const val = tarifaVencedora.valores[regId];
          const temPreco = val && (val.single > 0 || val.duplo > 0);

          if (temPreco) {
            linhas.push({
              id: `${dataIso}-${regId}-${tarifaVencedora.id}`,
              tarifaOriginal: tarifaVencedora,
              dataIso,
              dataExibicao: `${diaStr}/${mesStr}/${anoSelecionado}`,
              diaSemana: DIAS_SEMANA[diaSemanaIdx],
              diaSemanaIdx,
              tarifaNome: tarifaVencedora.nome,
              aptoVinculado: tarifaVencedora.aptoVinculado || "todos",
              regimeId: regId,
              regimeNome: REGIMES_ROTULOS[regId] || regId,
              single: val.single || 0,
              duplo: val.duplo || 0,
              adExtra: val.adicAdulto || val.adicCrianca || 0,
              minNoites: tarifaVencedora.minimoNoites || 1,
            });
          }
        });
      }
    }

    return linhas;
  };

  const todasLinhas = gerarLinhasCalendario();

  const linhasFiltradas = todasLinhas.filter((item) => {
    if (filtroTarifa !== "todas" && item.tarifaNome !== filtroTarifa) return false;
    if (filtroRegime !== "todos" && item.regimeId !== filtroRegime) return false;
    if (filtroApto !== "todos") {
      if (item.aptoVinculado !== "todos" && item.aptoVinculado !== filtroApto) return false;
    }
    return true;
  });

  const nomesTarifasUnicas = Array.from(new Set(todasLinhas.map((l) => l.tarifaNome)));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5 md:p-6 mt-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-700" />
          Gestão do Calendário
        </h3>
        <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-200">
          {linhasFiltradas.length} resultados
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="sm:col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Filtrar por Mês
          </label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
          >
            {MESES.map((m, idx) => (
              <option key={idx} value={idx}>
                {m} {anoSelecionado}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Filtrar por Tarifa
          </label>
          <select
            value={filtroTarifa}
            onChange={(e) => setFiltroTarifa(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
          >
            <option value="todas">Todas as tarifas</option>
            {nomesTarifasUnicas.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Filtrar por Regime Pensão
          </label>
          <select
            value={filtroRegime}
            onChange={(e) => setFiltroRegime(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
          >
            <option value="todos">Todos os regimes</option>
            {Object.entries(REGIMES_ROTULOS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Apartamento
          </label>
          <select
            value={filtroApto}
            onChange={(e) => setFiltroApto(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-900"
          >
            <option value="todos">Todos os aptos</option>
            {tiposApto.map((ap, idx) => (
              <option key={idx} value={ap.nome}>
                {ap.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-1 flex justify-end">
          <button
            type="button"
            onClick={limparFiltros}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold py-2 px-1 transition"
            title="Limpar todos os filtros"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
              <th className="py-3 px-3">Data</th>
              <th className="py-3 px-3">Dia</th>
              <th className="py-3 px-3">Tarifa</th>
              <th className="py-3 px-3">Alimentação</th>
              <th className="py-3 px-3">Single (1 Pax)</th>
              <th className="py-3 px-3 font-extrabold text-slate-700">Duplo (2 Pax)</th>
              <th className="py-3 px-3">Ad. Extra</th>
              <th className="py-3 px-3 text-center">Mín. Noites</th>
              <th className="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {linhasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                  Nenhum tarifário ativo encontrado para este mês ou filtro selecionado.
                </td>
              </tr>
            ) : (
              linhasFiltradas.map((linha) => {
                const estiloCor = obterEstiloTarifa(linha.tarifaNome);

                return (
                  <tr key={linha.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      {linha.dataExibicao}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-medium">
                      {linha.diaSemana}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`${estiloCor.bg} ${estiloCor.text} border ${estiloCor.border} font-bold px-2 py-0.5 rounded text-[10px] uppercase inline-block`}>
                        {linha.tarifaNome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">
                      {linha.regimeNome}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">
                      R$ {linha.single.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      R$ {linha.duplo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">
                      R$ {linha.adExtra.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {linha.minNoites}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditarTarifa(linha.tarifaOriginal, linha.dataIso, linha.diaSemanaIdx)}
                          className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                          title="Editar valor específico deste dia"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const idReal = linha.tarifaOriginal?.id || linha.tarifaOriginal?._id;
                            onExcluirTarifa(idReal);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Excluir tarifa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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

  const [abaAtiva, setAbaAtiva] = useState("sobre");

  const [filtroCidadeLista, setFiltroCidadeLista] = useState("todas");

  // Informações Básicas
  const [cidade, setCidade] = useState("Caldas Novas");
  const [estado, setEstado] = useState("GO");
  const [nome, setNome] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [checkinHora, setCheckinHora] = useState("14:00");
  const [checkoutHora, setCheckoutHora] = useState("11:00");

  const [pagamentoCartao, setPagamentoCartao] = useState("Em até 10x sem juros");
  const [pagamentoPix, setPagamentoPix] = useState("Desconto especial");
  const [pagamentoBoleto, setPagamentoBoleto] = useState("");

  const [tituloInclusoPacote, setTituloInclusoPacote] = useState("Parques que inclui no pacote");
  const [inclusoPacote, setInclusoPacote] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [fotosGerais, setFotosGerais] = useState([]);
  const [tiposApto, setTiposApto] = useState([]);

  const [tituloFotosParque, setTituloFotosParque] = useState("Fotos dos Parques Aquáticos");
  const [fotosParque, setFotosParque] = useState([]);
  const [tituloVideoParque, setTituloVideoParque] = useState("Vídeo dos Parques Aquáticos");
  const [videoParqueUrl, setVideoParqueUrl] = useState("");

  const [mostrarTituloValores, setMostrarTituloValores] = useState(true);
  const [tituloValoresCustomizado, setTituloValoresCustomizado] = useState("Valor total do pacote:");
  const [opcoesCriancas, setOpcoesCriancas] = useState(["até 12 anos", "0 a 5 anos cortesia"]);
  const [novaOpcaoCrianca, setNovaOpcaoCrianca] = useState("");

  const [mostrarLocalizacao, setMostrarLocalizacao] = useState(true);
  const [mostrarSobre, setMostrarSobre] = useState(true);
  const [mostrarVideo, setMostrarVideo] = useState(true);
  const [mostrarObs, setMostrarObs] = useState(true);
  const [mostrarFotosGerais, setMostrarFotosGerais] = useState(true);
  const [mostrarParques, setMostrarParques] = useState(true);
  const [mostrarVideoParque, setMostrarVideoParque] = useState(true);

  const [descricaoHtml, setDescricaoHtml] = useState("");
  const [observacoesHtml, setObservacoesHtml] = useState("");

  // =========================================================================
  // ESTADOS DO MÓDULO TARIFÁRIO (Aba 5)
  // =========================================================================
  const [tarifasCadastradas, setTarifasCadastradas] = useState([]);
  const [nomesTarifasPersistidos, setNomesTarifasPersistidos] = useState([]);
  const [carregandoTarifas, setCarregandoTarifas] = useState(false);
  const [salvandoTarifa, setSalvandoTarifa] = useState(false);
  const [tarifaEditandoId, setTarifaEditandoId] = useState(null);

  const [tarifaNome, setTarifaNome] = useState("");
  const [tarifaDataInicio, setTarifaDataInicio] = useState(obterDataHojeIso());
  const [tarifaDataFim, setTarifaDataFim] = useState(obterDataAmanhaIso());
  const [tarifaDiasSemana, setTarifaDiasSemana] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [tarifaMinNoites, setTarifaMinNoites] = useState("1");
  const [tarifaPacoteFechado, setTarifaPacoteFechado] = useState(false);
  const [tarifaAptoVinculado, setTarifaAptoVinculado] = useState("todos");
  const [regimeAbaAtiva, setRegimeAbaAtiva] = useState("cafe");
  
  const [tarifaValores, setTarifaValores] = useState({
    cafe: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
    cafe_almoco: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
    cafe_jantar: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
    pensao_completa: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
    sem_refeicao: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
  });

  // Modal Individual de Edição de Tarifa
  const [modalEditarTarifaAberto, setModalEditarTarifaAberto] = useState(false);
  const [tarifaEmEdicaoModal, setTarifaEmEdicaoModal] = useState(null);

  // Modal para Gerenciar / Criar / Renomear Nomes de Tarifas (Catálogo)
  const [modalRenomearAberto, setModalRenomearAberto] = useState(false);
  const [abaModalCatalogo, setAbaModalCatalogo] = useState("novo");
  const [novoNomeCatalogo, setNovoNomeCatalogo] = useState("");
  const [nomeParaRenomearAntigo, setNomeParaRenomearAntigo] = useState("");
  const [nomeParaRenomearNovo, setNomeParaRenomearNovo] = useState("");
  const [renomeandoMassa, setRenomeandoMassa] = useState(false);

  const [regrasCriancas, setRegrasCriancas] = useState({
    idadeMaximaCortesia: "12",
    qtdMaximaCortesia: "2",
    ativarFaixa2: false,
    faixa2Min: "13",
    faixa2Max: "17",
    faixa2Percentual: "50",
  });

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

  useEffect(() => {
    if (abaAtiva === "sobre" && modoVisualizacao === "formulario") {
      if (descRef.current && descRef.current.innerHTML !== descricaoHtml) {
        descRef.current.innerHTML = descricaoHtml || "";
      }
      if (obsRef.current && obsRef.current.innerHTML !== observacoesHtml) {
        obsRef.current.innerHTML = observacoesHtml || "";
      }
    }
  }, [abaAtiva, modoVisualizacao]);

  const handlePasteLimpo = (e) => {
    e.preventDefault();
    const textoLimpo = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, textoLimpo);
  };

  const sincronizarTextosRicos = () => {
    if (descRef.current) setDescricaoHtml(descRef.current.innerHTML);
    if (obsRef.current) setObservacoesHtml(obsRef.current.innerHTML);
  };

  const mudarAba = (novaAba) => {
    if (abaAtiva === "sobre") {
      sincronizarTextosRicos();
    }
    setAbaAtiva(novaAba);

    if (novaAba === "tarifario" && hotelEditandoId) {
      carregarTarifasERegras(hotelEditandoId);
    }
  };

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("fast_agencia");
    if (!dadosSalvos) {
      window.location.href = "/login";
      return;
    }
    const ag = JSON.parse(dadosSalvos);

    if (ag.permissao === "usuario") {
      window.location.href = "/";
      return;
    }

    setAgencia(ag);
    carregarHoteis(ag.id);
  }, []);

  const carregarHoteis = async (agenciaId) => {
    try {
      setCarregando(true);
      const q = query(collection(db, "hoteis"), where("agenciaId", "==", agencyIdSafe(agenciaId)));
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

  const carregarTarifasERegras = async (hotelId) => {
    try {
      setCarregandoTarifas(true);
      
      const colTarifas = collection(db, "hoteis", hotelId, "tarifas");
      const snapTarifas = await getDocs(colTarifas);
      const lista = [];
      snapTarifas.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setTarifasCadastradas(lista);

      const docRegrasRef = doc(db, "hoteis", hotelId, "configuracoes", "regras_criancas");
      const snapRegras = await getDoc(docRegrasRef);
      if (snapRegras.exists()) {
        const dados = snapRegras.data();
        setRegrasCriancas({
          idadeMaximaCortesia: String(dados.idadeMaximaCortesia ?? 12),
          qtdMaximaCortesia: String(dados.qtdMaximaCortesia ?? 2),
          ativarFaixa2: Boolean(dados.faixaAdicional),
          faixa2Min: String(dados.faixaAdicional?.idadeMin ?? 13),
          faixa2Max: String(dados.faixaAdicional?.idadeMax ?? 17),
          faixa2Percentual: String(dados.faixaAdicional?.percentual ?? 50),
        });
      }

      const docNomesRef = doc(db, "hoteis", hotelId, "configuracoes", "catalogo_nomes_tarifas");
      const snapNomes = await getDoc(docNomesRef);
      if (snapNomes.exists()) {
        setNomesTarifasPersistidos(snapNomes.data().nomes || []);
      }
    } catch (err) {
      console.error("Erro ao carregar tarifário:", err);
    } finally {
      setCarregandoTarifas(false);
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

    const vagasRestantes = 18 - fotosGerais.length;
    if (vagasRestantes <= 0) {
      abrirModal("error", "Limite Atingido", "Você já atingiu o limite máximo de 18 fotos gerais.");
      e.target.value = "";
      return;
    }

    const arquivosParaEnviar = files.slice(0, vagasRestantes);
    setEnviandoFotoGeral(true);
    try {
      const urls = [];
      for (const file of arquivosParaEnviar) {
        const url = await uploadParaCloudinary(file);
        urls.push(url);
      }
      setFotosGerais((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      abrirModal("error", "Falha no Upload", err.message || "Tente novamente.");
    } finally {
      setEnviandoFotoGeral(false);
      e.target.value = "";
    }
  };

  const removerFotoGeral = (idx) => {
    setFotosGerais((prev) => prev.filter((_, i) => i !== idx));
  };

  const definirFotoDestaqueGeral = (idx) => {
    if (idx === 0) return;
    setFotosGerais((prev) => {
      const nova = [...prev];
      const [item] = nova.splice(idx, 1);
      nova.unshift(item);
      return nova;
    });
  };

  const handleUploadFotosParque = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const vagasRestantes = 18 - fotosParque.length;
    if (vagasRestantes <= 0) {
      abrirModal("error", "Limite Atingido", "Você já atingiu o limite máximo de 18 fotos de parques.");
      e.target.value = "";
      return;
    }

    const arquivosParaEnviar = files.slice(0, vagasRestantes);
    setEnviandoFotoParque(true);
    try {
      const urls = [];
      for (const file of arquivosParaEnviar) {
        const url = await uploadParaCloudinary(file);
        urls.push(url);
      }
      setFotosParque((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      abrirModal("error", "Falha no Upload", err.message || "Tente novamente.");
    } finally {
      setEnviandoFotoParque(false);
      e.target.value = "";
    }
  };

  const removerFotoParque = (idx) => {
    setFotosParque((prev) => prev.filter((_, i) => i !== idx));
  };

  const definirFotoDestaqueParque = (idx) => {
    if (idx === 0) return;
    setFotosParque((prev) => {
      const nova = [...prev];
      const [item] = nova.splice(idx, 1);
      nova.unshift(item);
      return nova;
    });
  };

  const adicionarTipoApto = () => {
    setTiposApto((prev) => [...prev, { nome: "", descricao: "", fotos: [], mostrarNoSite: true }]);
  };

  const atualizarNomeApto = (index, novoNome) => {
    setTiposApto((prev) => {
      const lista = [...prev];
      lista[index] = { ...lista[index], nome: novoNome };
      return lista;
    });
  };

  const atualizarDescricaoApto = (index, novaDescricao) => {
    setTiposApto((prev) => {
      const lista = [...prev];
      lista[index] = { ...lista[index], descricao: novaDescricao };
      return lista;
    });
  };

  const alternarVisibilidadeApto = (index) => {
    setTiposApto((prev) => {
      const lista = [...prev];
      const statusAtual = lista[index].mostrarNoSite !== false;
      lista[index] = { ...lista[index], mostrarNoSite: !statusAtual };
      return lista;
    });
  };

  const removerTipoApto = (index) => {
    setTiposApto((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFotosApto = async (index, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const fotosAtuais = tiposApto[index].fotos || [];
    const vagasRestantes = 10 - fotosAtuais.length;
    if (vagasRestantes <= 0) {
      abrirModal("error", "Limite Atingido", "Limite máximo de 10 fotos por quarto atingido.");
      e.target.value = "";
      return;
    }

    const arquivosParaEnviar = files.slice(0, vagasRestantes);
    setEnviandoFotoAptoIndex(index);
    try {
      const urls = [];
      for (const file of arquivosParaEnviar) {
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
      console.error(err);
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

  const definirFotoDestaqueApto = (aptoIndex, fotoIndex) => {
    if (fotoIndex === 0) return;
    setTiposApto((prev) => {
      const lista = [...prev];
      const fotos = [...(lista[aptoIndex].fotos || [])];
      const [item] = fotos.splice(fotoIndex, 1);
      fotos.unshift(item);
      lista[aptoIndex] = { ...lista[aptoIndex], fotos };
      return lista;
    });
  };

  const adicionarOpcaoCrianca = () => {
    const textoLimpo = novaOpcaoCrianca.trim();
    if (!textoLimpo) return;
    if (!opcoesCriancas.includes(textoLimpo)) {
      setOpcoesCriancas((prev) => [...prev, textoLimpo]);
    }
    setNovaOpcaoCrianca("");
  };

  const removerOpcaoCrianca = (index) => {
    setOpcoesCriancas((prev) => prev.filter((_, i) => i !== index));
  };

  const abrirNovoHotel = () => {
    setHotelEditandoId(null);
    setAbaAtiva("sobre");
    setCidade("Caldas Novas");
    setEstado("GO");
    setNome("");
    setLogoUrl("");
    setLocalizacao("");
    setCheckinHora("14:00");
    setCheckoutHora("11:00");
    setPagamentoCartao("Em até 10x sem juros");
    setPagamentoPix("Desconto especial");
    setPagamentoBoleto("");
    setTituloInclusoPacote("Parques que inclui no pacote");
    setInclusoPacote("");
    setVideoUrl("");
    setFotosGerais([]);
    setTiposApto([]);
    setTituloFotosParque("Fotos dos Parques Aquáticos");
    setFotosParque([]);
    setTituloVideoParque("Vídeo dos Parques Aquáticos");
    setVideoParqueUrl("");
    setMostrarTituloValores(true);
    setTituloValoresCustomizado("Valor total do pacote:");
    setOpcoesCriancas(["até 12 anos", "0 a 5 anos cortesia"]);
    setNovaOpcaoCrianca("");
    setMostrarLocalizacao(true);
    setMostrarSobre(true);
    setMostrarVideo(true);
    setMostrarObs(true);
    setMostrarFotosGerais(true);
    setMostrarParques(true);
    setMostrarVideoParque(true);
    setDescricaoHtml("");
    setObservacoesHtml("");
    setTarifasCadastradas([]);
    setNomesTarifasPersistidos([]);
    limparFormTarifa();

    setTimeout(() => {
      if (descRef.current) descRef.current.innerHTML = "";
      if (obsRef.current) obsRef.current.innerHTML = "";
    }, 50);

    setModoVisualizacao("formulario");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const iniciarEdicao = (hotel) => {
    setHotelEditandoId(hotel.id);
    setAbaAtiva("sobre");
    setCidade(hotel.cidade || "Caldas Novas");
    setEstado(hotel.estado || "GO");
    setNome(hotel.nome || "");
    setLogoUrl(hotel.logoUrl || "");
    setLocalizacao(hotel.localizacao || "");
    setCheckinHora(hotel.checkinHora || "14:00");
    setCheckoutHora(hotel.checkoutHora || "11:00");
    setPagamentoCartao(hotel.pagamentoCartao !== undefined ? hotel.pagamentoCartao : "Em até 10x sem juros");
    setPagamentoPix(hotel.pagamentoPix !== undefined ? hotel.pagamentoPix : "Desconto especial");
    setPagamentoBoleto(hotel.pagamentoBoleto || "");
    setTituloInclusoPacote(hotel.tituloInclusoPacote || "Parques que inclui no pacote");
    setInclusoPacote((hotel.parquesDisponiveis || []).join(", "));
    setVideoUrl(hotel.videoUrl || "");
    setFotosGerais(hotel.fotos || []);
    setTiposApto(
      (hotel.tiposApto || []).map((ap) => ({
        nome: ap.nome || "",
        descricao: ap.descricao || "",
        fotos: ap.fotos || [],
        mostrarNoSite: ap.mostrarNoSite !== false,
      }))
    );
    setTituloFotosParque(hotel.tituloFotosParque || "Fotos dos Parques Aquáticos");
    setFotosParque(hotel.fotosParque || []);
    setTituloVideoParque(hotel.tituloVideoParque || "Vídeo dos Parques Aquáticos");
    setVideoParqueUrl(hotel.videoParqueUrl || "");
    setMostrarTituloValores(hotel.mostrarTituloValores !== false);
    setTituloValoresCustomizado(hotel.tituloValoresCustomizado || "Valor total do pacote:");
    setOpcoesCriancas(hotel.opcoesCriancas || ["até 12 anos"]);
    setNovaOpcaoCrianca("");
    setMostrarLocalizacao(hotel.mostrarLocalizacao !== false);
    setMostrarSobre(hotel.mostrarSobre !== false);
    setMostrarVideo(hotel.mostrarVideo !== false);
    setMostrarObs(hotel.mostrarObs !== false);
    setMostrarFotosGerais(hotel.mostrarFotosGerais !== false);
    setMostrarParques(hotel.mostrarParques !== false);
    setMostrarVideoParque(hotel.mostrarVideoParque !== false);
    setDescricaoHtml(hotel.descricao || "");
    setObservacoesHtml(hotel.observacoes || "");
    limparFormTarifa();

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
      const descFinal = (abaAtiva === "sobre" && descRef.current) ? descRef.current.innerHTML : descricaoHtml;
      const obsFinal = (abaAtiva === "sobre" && obsRef.current) ? obsRef.current.innerHTML : observacoesHtml;

      const listaIncluso = inclusoPacote
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const partesPagamento = [];
      if (pagamentoCartao.trim()) partesPagamento.push(pagamentoCartao.trim());
      if (pagamentoPix.trim()) partesPagamento.push(pagamentoPix.trim());
      if (pagamentoBoleto.trim()) partesPagamento.push(pagamentoBoleto.trim());
      const formaPagamentoUnificada = partesPagamento.join(" | ");

      const dados = {
        agenciaId: agencyIdSafe(agencia.id),
        cidade: formatarNomeCidade(cidade) || "Caldas Novas",
        estado: (estado || "GO").trim().toUpperCase().slice(0, 2),
        nome: nome.trim(),
        logoUrl: logoUrl.trim(),
        localizacao: localizacao.trim(),
        checkinHora: checkinHora.trim(),
        checkoutHora: checkoutHora.trim(),
        pagamentoCartao: pagamentoCartao.trim(),
        pagamentoPix: pagamentoPix.trim(),
        pagamentoBoleto: pagamentoBoleto.trim(),
        formaPagamento: formaPagamentoUnificada || "Em até 10x sem juros | Desconto especial no PIX",
        descricao: descFinal || "",
        tituloInclusoPacote: formatarTituloOrtografico(tituloInclusoPacote),
        parquesDisponiveis: listaIncluso,
        observacoes: obsFinal || "",
        videoUrl: videoUrl.trim(),
        fotos: fotosGerais,
        tiposApto: tiposApto
          .filter((a) => a.nome && a.nome.trim().length > 0)
          .map((a) => ({
            nome: a.nome.trim(),
            descricao: (a.descricao || "").trim(),
            fotos: a.fotos || [],
            mostrarNoSite: a.mostrarNoSite !== false,
          })),
        tituloFotosParque: tituloFotosParque.trim() || "Fotos dos Parques Aquáticos",
        fotosParque: fotosParque,
        tituloVideoParque: tituloVideoParque.trim() || "Vídeo dos Parques Aquáticos",
        videoParqueUrl: videoParqueUrl.trim(),
        mostrarTituloValores,
        tituloValoresCustomizado: tituloValoresCustomizado.trim() || "Valor total do pacote:",
        opcoesCriancas: opcoesCriancas.filter((op) => op && op.trim().length > 0),
        mostrarLocalizacao,
        mostrarSobre,
        mostrarVideo,
        mostrarObs,
        mostrarFotosGerais,
        mostrarParques,
        mostrarVideoParque,
      };

      if (hotelEditandoId) {
        await updateDoc(doc(db, "hoteis", hotelEditandoId), {
          ...dados,
          atualizadoEm: serverTimestamp(),
        });
        abrirModal("success", "Sucesso!", "Hotel atualizado com sucesso!");
      } else {
        const novoDoc = await addDoc(collection(db, "hoteis"), {
          ...dados,
          criadoEm: serverTimestamp(),
        });
        setHotelEditandoId(novoDoc.id);
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

  // =========================================================================
  // HANDLERS TARIFÁRIO INTELIGENTE (Aba 5)
  // =========================================================================
  const selecionarPredefinicaoDias = (tipo) => {
    if (tipo === "todos") setTarifaDiasSemana([0, 1, 2, 3, 4, 5, 6]);
    if (tipo === "dom_qui") setTarifaDiasSemana([0, 1, 2, 3]);
    if (tipo === "dom_sex") setTarifaDiasSemana([0, 1, 2, 3, 4]);
    if (tipo === "qui_dom") setTarifaDiasSemana([4, 5, 6]);
    if (tipo === "sex_dom") setTarifaDiasSemana([5, 6]);
  };

  const toggleDiaSemanaTarifa = (diaId) => {
    setTarifaDiasSemana((prev) =>
      prev.includes(diaId) ? prev.filter((d) => d !== diaId) : [...prev, diaId]
    );
  };

  const handleValorTarifaChange = (regimeId, campo, valor) => {
    const formatado = formatarMoedaInput(valor);
    setTarifaValores((prev) => ({
      ...prev,
      [regimeId]: {
        ...prev[regimeId],
        [campo]: formatado,
      },
    }));
  };

  const limparFormTarifa = () => {
    setTarifaEditandoId(null);
    setTarifaNome("");
    setTarifaDataInicio(obterDataHojeIso());
    setTarifaDataFim(obterDataAmanhaIso());
    setTarifaDiasSemana([0, 1, 2, 3, 4, 5, 6]);
    setTarifaMinNoites("1");
    setTarifaPacoteFechado(false);
    setTarifaAptoVinculado("todos");
    setTarifaValores({
      cafe: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
      cafe_almoco: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
      cafe_jantar: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
      pensao_completa: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
      sem_refeicao: { single: "", duplo: "", adicAdulto: "", adicCrianca: "" },
    });
  };

  // Nomes únicos cadastrados nas tarifas + nomes adicionados no catálogo
  const nomesTarifasCatalogo = Array.from(
    new Set([
      ...nomesTarifasPersistidos,
      ...tarifasCadastradas.map((t) => (t.nome || "").trim().toUpperCase()).filter(Boolean),
    ])
  );

  // Adicionar um novo nome ao catálogo de tarifas (força maiúsculas)
  const salvarNovoNomeCatalogo = async () => {
    const nomeLimpo = novoNomeCatalogo.trim().toUpperCase();
    if (!nomeLimpo) {
      abrirModal("error", "Atenção", "Digite um nome para a tarifa.");
      return;
    }

    if (!hotelEditandoId) {
      abrirModal("error", "Atenção", "Salve o hotel primeiro antes de cadastrar nomes de tarifas.");
      return;
    }

    try {
      setRenomeandoMassa(true);
      const nomesAtualizados = Array.from(new Set([...nomesTarifasCatalogo, nomeLimpo]));
      const docNomesRef = doc(db, "hoteis", hotelEditandoId, "configuracoes", "catalogo_nomes_tarifas");
      await setDoc(docNomesRef, { nomes: nomesAtualizados, atualizadoEm: serverTimestamp() }, { merge: true });

      setNomesTarifasPersistidos(nomesAtualizados);
      setTarifaNome(nomeLimpo);
      setNovoNomeCatalogo("");
      setModalRenomearAberto(false);
      abrirModal("success", "Nome Adicionado", `O nome "${nomeLimpo}" foi adicionado com sucesso ao seu catálogo!`);
    } catch (err) {
      console.error("Erro ao salvar nome no catálogo:", err);
      abrirModal("error", "Erro", "Não foi possível salvar o nome no catálogo.");
    } finally {
      setRenomeandoMassa(false);
    }
  };

  // Abre Modal Individual para edição isolada de 1 DIA ou período
  const abrirModalEditarTarifa = (t, dataIsoClicada = null, diaSemanaIdx = null) => {
    const novosValores = {};
    REGIMES_LISTA.forEach((r) => {
      const dadosR = t.valores?.[r.id] || {};
      novosValores[r.id] = {
        single: dadosR.single ? formatarMoedaInput(String(Math.round(dadosR.single * 100))) : "",
        duplo: dadosR.duplo ? formatarMoedaInput(String(Math.round(dadosR.duplo * 100))) : "",
        adicAdulto: dadosR.adicAdulto ? formatarMoedaInput(String(Math.round(dadosR.adicAdulto * 100))) : "",
        adicCrianca: dadosR.adicCrianca ? formatarMoedaInput(String(Math.round(dadosR.adicCrianca * 100))) : "",
      };
    });

    const isEdicaoDiaEspecifico = Boolean(dataIsoClicada);
    const dataInicioFinal = isEdicaoDiaEspecifico ? dataIsoClicada : (t.dataInicio || obterDataHojeIso());
    const dataFimFinal = isEdicaoDiaEspecifico ? dataIsoClicada : (t.dataFim || obterDataAmanhaIso());
    const diasSemanaFinal = isEdicaoDiaEspecifico && diaSemanaIdx !== null ? [diaSemanaIdx] : (t.diasSemana || [0, 1, 2, 3, 4, 5, 6]);

    setTarifaEmEdicaoModal({
      idOriginal: t.id,
      isExcecaoDiaria: isEdicaoDiaEspecifico && (t.dataInicio !== t.dataFim),
      nome: (t.nome || "").toUpperCase(),
      dataInicio: dataInicioFinal,
      dataFim: dataFimFinal,
      diasSemana: diasSemanaFinal,
      minimoNoites: String(t.minimoNoites || 1),
      pacoteFechado: Boolean(t.pacoteFechado),
      aptoVinculado: t.aptoVinculado || "todos",
      valores: novosValores,
      regimeAtivo: "cafe",
    });

    setModalEditarTarifaAberto(true);
  };

  const salvarTarifaPeloModal = async () => {
    if (!hotelEditandoId || !tarifaEmEdicaoModal) return;

    try {
      const valoresNumericos = {};
      REGIMES_LISTA.forEach((r) => {
        const item = tarifaEmEdicaoModal.valores[r.id] || {};
        valoresNumericos[r.id] = {
          single: converterMoedaParaFloat(item.single),
          duplo: converterMoedaParaFloat(item.duplo),
          adicAdulto: converterMoedaParaFloat(item.adicAdulto),
          adicCrianca: converterMoedaParaFloat(item.adicCrianca),
        };
      });

      const dadosTarifa = {
        nome: tarifaEmEdicaoModal.nome.trim().toUpperCase(),
        dataInicio: tarifaEmEdicaoModal.dataInicio,
        dataFim: tarifaEmEdicaoModal.dataFim,
        diasSemana: tarifaEmEdicaoModal.diasSemana,
        minimoNoites: parseInt(tarifaEmEdicaoModal.minimoNoites, 10) || 1,
        pacoteFechado: Boolean(tarifaEmEdicaoModal.pacoteFechado),
        aptoVinculado: tarifaEmEdicaoModal.aptoVinculado || "todos",
        ativo: true,
        valores: valoresNumericos,
        atualizadoEm: serverTimestamp(),
      };

      if (tarifaEmEdicaoModal.isExcecaoDiaria) {
        await addDoc(collection(db, "hoteis", hotelEditandoId, "tarifas"), {
          ...dadosTarifa,
          criadoEm: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "hoteis", hotelEditandoId, "tarifas", tarifaEmEdicaoModal.idOriginal), dadosTarifa);
      }

      setModalEditarTarifaAberto(false);
      setTarifaEmEdicaoModal(null);
      await carregarTarifasERegras(hotelEditandoId);
      abrirModal("success", "Tarifa Atualizada!", "O valor da tarifa foi salvo com sucesso.");
    } catch (err) {
      console.error(err);
      abrirModal("error", "Erro ao Atualizar", "Não foi possível salvar as alterações da tarifa.");
    }
  };

  // Renomear em massa todas as tarifas que têm determinado nome (força maiúsculas)
  const executarRenomeacaoMassa = async () => {
    const antigo = (nomeParaRenomearAntigo || "").trim().toUpperCase();
    const novo = (nomeParaRenomearNovo || "").trim().toUpperCase();

    if (!antigo || !novo || antigo === novo) {
      abrirModal("error", "Atenção", "Informe o nome novo para renomear.");
      return;
    }

    try {
      setRenomeandoMassa(true);
      const batch = writeBatch(db);
      const tarifasParaAlterar = tarifasCadastradas.filter(
        (t) => (t.nome || "").trim().toUpperCase() === antigo
      );

      tarifasParaAlterar.forEach((tarifa) => {
        const ref = doc(db, "hoteis", hotelEditandoId, "tarifas", tarifa.id);
        batch.update(ref, {
          nome: novo,
          atualizadoEm: serverTimestamp(),
        });
      });

      const docNomesRef = doc(db, "hoteis", hotelEditandoId, "configuracoes", "catalogo_nomes_tarifas");
      const novosNomesPersistidos = nomesTarifasCatalogo.map((n) => (n.toUpperCase() === antigo ? novo : n));
      batch.set(docNomesRef, { nomes: Array.from(new Set(novosNomesPersistidos)), atualizadoEm: serverTimestamp() }, { merge: true });

      await batch.commit();
      setModalRenomearAberto(false);
      setNomeParaRenomearAntigo("");
      setNomeParaRenomearNovo("");
      await carregarTarifasERegras(hotelEditandoId);
      abrirModal("success", "Catálogo Atualizado", `Todas as tarifas com nome "${antigo}" foram alteradas para "${novo}".`);
    } catch (err) {
      console.error("Erro ao renomear em lote:", err);
      abrirModal("error", "Erro", "Não foi possível atualizar o nome das tarifas em massa.");
    } finally {
      setRenomeandoMassa(false);
    }
  };

  const salvarNovaTarifa = async () => {
    if (!hotelEditandoId) {
      abrirModal("error", "Atenção", "Salve o hotel primeiro antes de cadastrar tarifas.");
      return;
    }
    if (!tarifaNome.trim() || !tarifaDataInicio || !tarifaDataFim) {
      abrirModal("error", "Campos Obrigatórios", "Informe o nome da tarifa e as datas de início e término.");
      return;
    }

    setSalvandoTarifa(true);
    try {
      const valoresNumericos = {};
      REGIMES_LISTA.forEach((r) => {
        const item = tarifaValores[r.id] || {};
        valoresNumericos[r.id] = {
          single: converterMoedaParaFloat(item.single),
          duplo: converterMoedaParaFloat(item.duplo),
          adicAdulto: converterMoedaParaFloat(item.adicAdulto),
          adicCrianca: converterMoedaParaFloat(item.adicCrianca),
        };
      });

      const dadosTarifa = {
        nome: tarifaNome.trim().toUpperCase(),
        dataInicio: tarifaDataInicio,
        dataFim: tarifaDataFim,
        diasSemana: tarifaDiasSemana,
        minimoNoites: parseInt(tarifaMinNoites, 10) || 1,
        pacoteFechado: Boolean(tarifaPacoteFechado),
        aptoVinculado: tarifaAptoVinculado || "todos",
        ativo: true,
        valores: valoresNumericos,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      };

      await addDoc(collection(db, "hoteis", hotelEditandoId, "tarifas"), dadosTarifa);

      limparFormTarifa();
      carregarTarifasERegras(hotelEditandoId);
      abrirModal("success", "Tarifa Salva!", "Nova regra de tarifa adicionada ao hotel.");
    } catch (err) {
      console.error(err);
      abrirModal("error", "Erro ao Salvar", "Não foi possível gravar a tarifa.");
    } finally {
      setSalvandoTarifa(false);
    }
  };

  const excluirTarifa = (tarifaId) => {
    if (!hotelEditandoId || !tarifaId) {
      abrirModal("error", "Erro", "Identificador do hotel ou da tarifa não encontrado.");
      return;
    }

    abrirModal(
      "confirm",
      "Excluir Tarifa",
      "Deseja realmente excluir este período tarifário? Esta ação não poderá ser desfeita.",
      async () => {
        try {
          const docRef = doc(db, "hoteis", hotelEditandoId, "tarifas", tarifaId);
          await deleteDoc(docRef);
          setTarifasCadastradas((prev) => prev.filter((t) => t.id !== tarifaId));
          abrirModal("success", "Sucesso", "Tarifa excluída com sucesso!");
        } catch (err) {
          console.error("Erro ao deletar documento no Firestore:", err);
          setTimeout(() => {
            abrirModal("error", "Erro", "Não foi possível excluir a tarifa.");
          }, 200);
        }
      }
    );
  };

  const salvarRegrasCriancas = async () => {
    if (!hotelEditandoId) return;
    try {
      const docRef = doc(db, "hoteis", hotelEditandoId, "configuracoes", "regras_criancas");
      const dados = {
        idadeMaximaCortesia: parseInt(regrasCriancas.idadeMaximaCortesia, 10) || 12,
        qtdMaximaCortesia: parseInt(regrasCriancas.qtdMaximaCortesia, 10) || 2,
        faixaAdicional: regrasCriancas.ativarFaixa2
          ? {
              idadeMin: parseInt(regrasCriancas.faixa2Min, 10) || 13,
              idadeMax: parseInt(regrasCriancas.faixa2Max, 10) || 17,
              percentual: parseInt(regrasCriancas.faixa2Percentual, 10) || 50,
            }
          : null,
        atualizadoEm: serverTimestamp(),
      };
      await setDoc(docRef, dados, { merge: true });
      abrirModal("success", "Regras Salvas", "Regras de cortesias e adicionais de crianças atualizadas!");
    } catch (err) {
      console.error(err);
      abrirModal("error", "Erro", "Não foi possível salvar as regras de crianças.");
    }
  };

  const cidadesDisponiveis = Array.from(
    new Set(hoteis.map((h) => h.cidade || "Caldas Novas").filter(Boolean))
  );

  const hoteisFiltradosLista = hoteis.filter((h) => {
    if (filtroCidadeLista === "todas") return true;
    const cid = h.cidade || "Caldas Novas";
    return cid.toLowerCase() === filtroCidadeLista.toLowerCase();
  });

  const temPermissaoTarifario = Boolean(agencia?.permiteTarifario);
  const hojeIso = obterDataHojeIso();

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Hotéis Cadastrados ({hoteisFiltradosLista.length})
              </h2>

              {cidadesDisponiveis.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase px-2 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-brand-700" /> Cidade:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiltroCidadeLista("todas")}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                      filtroCidadeLista === "todas"
                        ? "bg-brand-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Todas ({hoteis.length})
                  </button>
                  {cidadesDisponiveis.map((cid) => {
                    const qtd = hoteis.filter((h) => (h.cidade || "Caldas Novas").toLowerCase() === cid.toLowerCase()).length;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setFiltroCidadeLista(cid)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                          filtroCidadeLista.toLowerCase() === cid.toLowerCase()
                            ? "bg-brand-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {cid} ({qtd})
                      </button>
                    );
                  })}
                </div>
              )}
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
            ) : hoteisFiltradosLista.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Nenhum hotel encontrado nesta cidade.</p>
                <button
                  type="button"
                  onClick={() => setFiltroCidadeLista("todas")}
                  className="mt-3 text-xs text-brand-900 underline font-bold"
                >
                  Ver todos os hotéis
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hoteisFiltradosLista.map((h) => (
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
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            {h.cidade || "Caldas Novas"} - {h.estado || "GO"}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900">{h.nome}</h3>
                        {h.localizacao && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{h.localizacao}</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-700" />
                {hotelEditandoId ? "Editar Informações do Hotel" : "Cadastrar Novo Hotel / Resort"}
              </h2>
              <button
                type="button"
                onClick={cancelarEdicao}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white w-fit"
              >
                <X className="w-4 h-4" />
                Voltar à Lista
              </button>
            </div>

            {/* BARRA DE NAVEGAÇÃO POR ABAS */}
            <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex flex-wrap gap-1 shadow-sm">
              <button
                type="button"
                onClick={() => mudarAba("sobre")}
                className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  abaAtiva === "sobre"
                    ? "bg-brand-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Sobre & Regras</span>
              </button>

              <button
                type="button"
                onClick={() => mudarAba("videos")}
                className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  abaAtiva === "videos"
                    ? "bg-brand-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>2. Vídeos</span>
              </button>

              <button
                type="button"
                onClick={() => mudarAba("fotos")}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  abaAtiva === "fotos"
                    ? "bg-brand-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>3. Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => mudarAba("apartamentos")}
                className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  abaAtiva === "apartamentos"
                    ? "bg-brand-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <BedDouble className="w-4 h-4" />
                <span>4. Apartamentos</span>
                {tiposApto.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${abaAtiva === "apartamentos" ? "bg-brand-800 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {tiposApto.length}
                  </span>
                )}
              </button>

              {temPermissaoTarifario && (
                <button
                  type="button"
                  onClick={() => mudarAba("tarifario")}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                    abaAtiva === "tarifario"
                      ? "bg-amber-600 text-white shadow"
                      : "text-amber-800 bg-amber-50/70 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>5. Tarifário & Regras</span>
                  {tarifasCadastradas.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-800 text-white">
                      {tarifasCadastradas.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* ABA 1: SOBRE */}
            {abaAtiva === "sobre" && (
              <div className="space-y-5">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Informações Básicas</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Caldas Novas, Rio Quente, Olímpia, Gramado"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        onBlur={(e) => setCidade(formatarNomeCidade(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-900"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                        Estado (UF) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="Ex: GO"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-brand-900"
                      />
                    </div>

                    <div className="md:col-span-12">
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

                    <div className="md:col-span-12 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    <div className="md:col-span-12">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 uppercase block">
                          Localização / Endereço
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${mostrarLocalizacao ? "text-emerald-700" : "text-slate-400"}`}>
                            {mostrarLocalizacao ? "Visível no site" : "Oculto no site"}
                          </span>
                          <ToggleSwitch
                            ativo={mostrarLocalizacao}
                            onToggle={() => setMostrarLocalizacao((v) => !v)}
                            label="Mostrar localização no site"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: Av. Santo Amaro, Bairro Turista 1 - Caldas Novas, GO"
                        value={localizacao}
                        onChange={(e) => setLocalizacao(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                      />
                    </div>

                    <div className="md:col-span-6">
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

                    <div className="md:col-span-6">
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

                    <div className="md:col-span-12 space-y-2 pt-1 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-700 uppercase block flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-brand-700" />
                        Formas de Pagamento Padrão
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">Condição 1</span>
                          <input
                            type="text"
                            placeholder="Ex: Em até 10x sem juros"
                            value={pagamentoCartao}
                            onChange={(e) => setPagamentoCartao(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">Condição 2</span>
                          <input
                            type="text"
                            placeholder="Ex: Desconto especial no PIX"
                            value={pagamentoPix}
                            onChange={(e) => setPagamentoPix(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">Condição 3 (Opcional)</span>
                          <input
                            type="text"
                            placeholder="Ex: Entrada + boleto até o check-in"
                            value={pagamentoBoleto}
                            onChange={(e) => setPagamentoBoleto(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-12">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <label className="text-xs font-bold text-slate-700 uppercase block">
                          Sobre o Hotel
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold ${mostrarSobre ? "text-emerald-700" : "text-slate-400"}`}>
                              {mostrarSobre ? "Visível no site" : "Oculto no site"}
                            </span>
                            <ToggleSwitch
                              ativo={mostrarSobre}
                              onToggle={() => setMostrarSobre((v) => !v)}
                              label="Mostrar sobre no site"
                            />
                          </div>
                          <EditorToolbar editorRef={descRef} />
                        </div>
                      </div>
                      <div
                        ref={descRef}
                        contentEditable
                        onPaste={handlePasteLimpo}
                        onBlur={sincronizarTextosRicos}
                        className="w-full min-h-[170px] max-h-[320px] overflow-y-auto bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed shadow-inner"
                        placeholder="Cole ou digite a descrição do hotel."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Inclusões & Observações</h3>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Título das Inclusões (Orçamento WhatsApp e Vitrine)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Parques que inclui no pacote"
                      value={tituloInclusoPacote}
                      onChange={(e) => setTituloInclusoPacote(e.target.value)}
                      onBlur={(e) => setTituloInclusoPacote(formatarTituloOrtografico(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Itens Inclusos no Pacote (Separados por vírgula)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Clube Privê, Water Park, Wi-Fi grátis"
                      value={inclusoPacote}
                      onChange={(e) => setInclusoPacote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase block">
                        Observações Gerais
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${mostrarObs ? "text-emerald-700" : "text-slate-400"}`}>
                            {mostrarObs ? "Visível no site" : "Oculto no site"}
                          </span>
                          <ToggleSwitch
                            ativo={mostrarObs}
                            onToggle={() => setMostrarObs((v) => !v)}
                            label="Mostrar observações no site"
                          />
                        </div>
                        <EditorToolbar editorRef={obsRef} />
                      </div>
                    </div>
                    <div
                      ref={obsRef}
                      contentEditable
                      onPaste={handlePasteLimpo}
                      onBlur={sincronizarTextosRicos}
                      className="w-full min-h-[160px] max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed shadow-inner"
                      placeholder="Ex: Taxa de turismo inclusa. Proibido entrada com alimentos na área de piscinas."
                    />
                  </div>

                  {/* CONFIGURAÇÕES DO WHATSAPP */}
                  <div className="mt-5 p-4 md:p-5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-2xl border-2 border-emerald-200/90 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-2.5">
                      <MessageSquare className="w-4 h-4 text-emerald-800" />
                      <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                        Configurações do Orçamento (WhatsApp)
                      </h4>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase block">
                          Título dos Valores no WhatsApp
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${mostrarTituloValores ? "text-emerald-700" : "text-slate-400"}`}>
                            {mostrarTituloValores ? "Ativo" : "Oculto"}
                          </span>
                          <ToggleSwitch
                            ativo={mostrarTituloValores}
                            onToggle={() => setMostrarTituloValores((v) => !v)}
                            label="Mostrar título antes dos valores"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        disabled={!mostrarTituloValores}
                        placeholder="Ex: Valor total do pacote:"
                        value={tituloValoresCustomizado}
                        onChange={(e) => setTituloValoresCustomizado(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900 font-semibold disabled:opacity-50"
                      />
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                      <label className="text-xs font-bold text-slate-800 uppercase block flex items-center gap-1.5">
                        <Baby className="w-3.5 h-3.5 text-brand-700" />
                        Opções Rápidas de Texto para Crianças
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ex: até 12 anos, 0 a 5 anos cortesia"
                          value={novaOpcaoCrianca}
                          onChange={(e) => setNovaOpcaoCrianca(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              adicionarOpcaoCrianca();
                            }
                          }}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-900"
                        />
                        <button
                          type="button"
                          onClick={adicionarOpcaoCrianca}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar
                        </button>
                      </div>

                      {opcoesCriancas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {opcoesCriancas.map((op, opIdx) => (
                            <span
                              key={opIdx}
                              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-medium shadow-xs"
                            >
                              <span>{op}</span>
                              <button
                                type="button"
                                onClick={() => removerOpcaoCrianca(opIdx)}
                                className="text-emerald-700 hover:text-red-600 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: VÍDEOS */}
            {abaAtiva === "videos" && (
              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-600" />
                    Links de Vídeos (Hotel & Parques)
                  </h3>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Vídeo Principal do Hotel (YouTube ou Shorts)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${mostrarVideo ? "text-emerald-700" : "text-slate-400"}`}>
                        {mostrarVideo ? "Visível" : "Oculto"}
                      </span>
                      <ToggleSwitch
                        ativo={mostrarVideo}
                        onToggle={() => setMostrarVideo((v) => !v)}
                        label="Mostrar vídeo no site"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Ex: https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-900"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                        Título do Vídeo do Parque
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Conheça as atrações do Water Park"
                        value={tituloVideoParque}
                        onChange={(e) => setTituloVideoParque(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900 font-semibold"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 uppercase block">
                          Link do Vídeo do Parque
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${mostrarVideoParque ? "text-emerald-700" : "text-slate-400"}`}>
                            {mostrarVideoParque ? "Visível" : "Oculto"}
                          </span>
                          <ToggleSwitch
                            ativo={mostrarVideoParque}
                            onToggle={() => setMostrarVideoParque((v) => !v)}
                            label="Mostrar vídeo do parque"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          placeholder="Ex: https://www.youtube.com/watch?v=..."
                          value={videoParqueUrl}
                          onChange={(e) => setVideoParqueUrl(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-9 pr-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: FOTOS */}
            {abaAtiva === "fotos" && (
              <div className="space-y-6">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        Fotos Gerais ({fotosGerais.length}/18)
                      </h3>
                      <ToggleSwitch
                        ativo={mostrarFotosGerais}
                        onToggle={() => setMostrarFotosGerais((v) => !v)}
                        label="Mostrar fotos gerais"
                      />
                    </div>
                    
                    <label className={`cursor-pointer inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0 ${enviandoFotoGeral || fotosGerais.length >= 18 ? "opacity-50 pointer-events-none" : ""}`}>
                      {enviandoFotoGeral ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      <span>{enviandoFotoGeral ? "Enviando..." : `Adicionar Fotos (${fotosGerais.length}/18)`}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleUploadFotosGerais}
                        disabled={fotosGerais.length >= 18}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {fotosGerais.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {fotosGerais.map((url, idx) => (
                        <div key={idx} className={`relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border-2 ${idx === 0 ? "border-amber-500 ring-2 ring-amber-400/30" : "border-slate-200"}`}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {idx === 0 ? (
                            <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              <span>Capa</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => definirFotoDestaqueGeral(idx)}
                              className="absolute top-1 left-1 bg-black/60 hover:bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-90 group-hover:opacity-100 transition shadow flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              <span>Capa</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removerFotoGeral(idx)}
                            className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 group-hover:opacity-100 transition shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Waves className="w-5 h-5 text-sky-600" />
                        Fotos dos Parques ({fotosParque.length}/18)
                      </h3>
                      <ToggleSwitch
                        ativo={mostrarParques}
                        onToggle={() => setMostrarParques((v) => !v)}
                        label="Mostrar fotos dos parques"
                      />
                    </div>
                    
                    <label className={`cursor-pointer inline-flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0 ${enviandoFotoParque || fotosParque.length >= 18 ? "opacity-50 pointer-events-none" : ""}`}>
                      {enviandoFotoParque ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      <span>{enviandoFotoParque ? "Enviando..." : `Adicionar Fotos (${fotosParque.length}/18)`}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleUploadFotosParque}
                        disabled={fotosParque.length >= 18}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Título da Seção de Parques
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Fotos do Water Park & Clube Privê"
                      value={tituloFotosParque}
                      onChange={(e) => setTituloFotosParque(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs md:text-sm font-semibold"
                    />
                  </div>

                  {fotosParque.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {fotosParque.map((url, idx) => (
                        <div key={idx} className={`relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border-2 ${idx === 0 ? "border-amber-500 ring-2 ring-amber-400/30" : "border-slate-200"}`}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {idx === 0 ? (
                            <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              <span>Capa</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => definirFotoDestaqueParque(idx)}
                              className="absolute top-1 left-1 bg-black/60 hover:bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-90 group-hover:opacity-100 transition shadow flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              <span>Capa</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removerFotoParque(idx)}
                            className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-md opacity-90 group-hover:opacity-100 transition shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 4: APARTAMENTOS */}
            {abaAtiva === "apartamentos" && (
              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    Tipos de Apartamentos
                  </h3>
                  
                  <button
                    type="button"
                    onClick={adicionarTipoApto}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Tipo de Apto
                  </button>
                </div>

                {tiposApto.map((apto, index) => {
                  const qtdFotos = apto.fotos?.length || 0;
                  const limiteAtingido = qtdFotos >= 10;

                  return (
                    <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Apartamento #{index + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <ToggleSwitch
                            ativo={apto.mostrarNoSite !== false}
                            onToggle={() => alternarVisibilidadeApto(index)}
                            label="Mostrar quarto"
                          />
                          <button
                            type="button"
                            onClick={() => removerTipoApto(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Nome da categoria (ex: Suíte Master)"
                          value={apto.nome}
                          onChange={(e) => atualizarNomeApto(index, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm font-semibold"
                        />
                        <input
                          type="text"
                          placeholder="Descrição (ex: 1 cama de casal, TV, ar, frigobar)"
                          value={apto.descricao || ""}
                          onChange={(e) => atualizarDescricaoApto(index, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">Fotos do quarto ({qtdFotos}/10)</span>
                          <label className={`cursor-pointer inline-flex items-center gap-1.5 bg-white border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm ${enviandoFotoAptoIndex === index || limiteAtingido ? "opacity-50 pointer-events-none" : ""}`}>
                            {enviandoFotoAptoIndex === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                            <span>{enviandoFotoAptoIndex === index ? "Enviando..." : "Adicionar Fotos"}</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleUploadFotosApto(index, e)}
                              disabled={limiteAtingido}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {apto.fotos?.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {apto.fotos.map((fotoUrl, fIdx) => (
                              <div key={fIdx} className={`relative group rounded-lg overflow-hidden aspect-video bg-slate-200 border-2 ${fIdx === 0 ? "border-amber-500" : "border-transparent"}`}>
                                <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
                                {fIdx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => definirFotoDestaqueApto(index, fIdx)}
                                    className="absolute top-1 left-1 bg-black/60 hover:bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-90 group-hover:opacity-100"
                                  >
                                    Capa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removerFotoApto(index, fIdx)}
                                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-90 group-hover:opacity-100"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ABA 5: TARIFÁRIO INTELIGENTE com travas de datas mínimas (hoje) */}
            {abaAtiva === "tarifario" && temPermissaoTarifario && (
              <div className="space-y-6">
                {!hotelEditandoId ? (
                  <div className="bg-amber-50 border border-amber-300 p-6 rounded-2xl text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <h3 className="font-bold text-sm text-amber-900">Salve o hotel primeiro</h3>
                    <p className="text-xs text-amber-700">
                      Preencha o nome do hotel e clique em &quot;Gravar Hotel Completo&quot; no rodapé para liberar o cadastro de tarifas.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* FORMULÁRIO DE CADASTRO GERAL */}
                    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-amber-600" />
                            Cadastrar Nova Tarifa / Temporada
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Adicione períodos e valores. Regras de menos dias (ex: Final de semana) sobrepõem dias comuns.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAbaModalCatalogo("novo");
                            setNovoNomeCatalogo("");
                            setNomeParaRenomearAntigo(nomesTarifasCatalogo[0] || "");
                            setNomeParaRenomearNovo(nomesTarifasCatalogo[0] || "");
                            setModalRenomearAberto(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
                          title="Criar novo nome ou renomear nomes existentes do catálogo"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Gerenciar Nomes</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6">
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                            Nome da Tarifa / Temporada *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              list="lista-nomes-tarifas"
                              placeholder="Digite ou selecione (ex: BAIXA, FINAL DE SEMANA)"
                              value={tarifaNome}
                              onChange={(e) => setTarifaNome(e.target.value.toUpperCase())}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs md:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600 uppercase"
                            />
                            <datalist id="lista-nomes-tarifas">
                              {nomesTarifasCatalogo.map((nm) => (
                                <option key={nm} value={nm} />
                              ))}
                            </datalist>
                          </div>
                          {nomesTarifasCatalogo.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Sugestões:</span>
                              {nomesTarifasCatalogo.map((nm) => (
                                <button
                                  key={nm}
                                  type="button"
                                  onClick={() => setTarifaNome(nm.toUpperCase())}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-200 transition uppercase"
                                >
                                  {nm}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                            Data Início *
                          </label>
                          <input
                            type="date"
                            min={hojeIso}
                            value={tarifaDataInicio}
                            onChange={(e) => setTarifaDataInicio(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs md:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                            Data Fim *
                          </label>
                          <input
                            type="date"
                            min={tarifaDataInicio || hojeIso}
                            value={tarifaDataFim}
                            onChange={(e) => setTarifaDataFim(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs md:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600"
                          />
                        </div>

                        <div className="md:col-span-12 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700 uppercase block">
                              Aplicar nestes dias da semana:
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Atalhos:</span>
                              <button
                                type="button"
                                onClick={() => selecionarPredefinicaoDias("todos")}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                              >
                                Todos
                              </button>
                              <button
                                type="button"
                                onClick={() => selecionarPredefinicaoDias("dom_qui")}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                                title="Entrada Domingo e Saída Quinta (Dorme Dom, Seg, Ter, Qua = 4 noites)"
                              >
                                Dom a Qui
                              </button>
                              <button
                                type="button"
                                onClick={() => selecionarPredefinicaoDias("dom_sex")}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                                title="Entrada Domingo e Saída Sexta (Dorme Dom, Seg, Ter, Qua, Qui = 5 noites)"
                              >
                                Dom a Sex
                              </button>
                              <button
                                type="button"
                                onClick={() => selecionarPredefinicaoDias("qui_dom")}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition"
                                title="Entrada Quinta e Saída Domingo (Dorme Qui, Sex, Sáb = 3 noites)"
                              >
                                Qui a Dom
                              </button>
                              <button
                                type="button"
                                onClick={() => selecionarPredefinicaoDias("sex_dom")}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                                title="Entrada Sexta e Saída Domingo (Dorme Sex e Sáb = 2 noites)"
                              >
                                Sex a Dom
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {DIAS_SEMANA_NOMES.map((d) => {
                              const ativo = tarifaDiasSemana.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => toggleDiaSemanaTarifa(d.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                    ativo
                                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                      : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="md:col-span-12 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <label className="text-xs font-bold text-slate-800 uppercase block">
                            Válido para qual Acomodação?
                          </label>
                          <select
                            value={tarifaAptoVinculado}
                            onChange={(e) => setTarifaAptoVinculado(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-600"
                          >
                            <option value="todos">Todos os Apartamentos (Geral)</option>
                            {tiposApto.map((ap, idx) => (
                              <option key={idx} value={ap.nome}>
                                Apenas: {ap.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 uppercase block">Mínimo de Noites</span>
                            <span className="text-[11px] text-slate-500">Bloqueia períodos menores.</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={tarifaMinNoites}
                            onChange={(e) => setTarifaMinNoites(e.target.value)}
                            className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-center text-sm font-bold"
                          />
                        </div>

                        <div className="md:col-span-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 uppercase block">Trava de Pacote Fechado?</span>
                            <span className="text-[11px] text-slate-500">Exige contratação integral do período.</span>
                          </div>
                          <ToggleSwitch
                            ativo={tarifaPacoteFechado}
                            onToggle={() => setTarifaPacoteFechado((v) => !v)}
                            label="Trava de pacote fechado"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <label className="text-xs font-bold text-slate-800 uppercase block">
                          Valores das Diárias por Regime de Pensão:
                        </label>

                        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
                          {REGIMES_LISTA.map((reg) => (
                            <button
                              key={reg.id}
                              type="button"
                              onClick={() => setRegimeAbaAtiva(reg.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                regimeAbaAtiva === reg.id
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {reg.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                              Single (1 pessoa)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              value={tarifaValores[regimeAbaAtiva]?.single || ""}
                              onChange={(e) => handleValorTarifaChange(regimeAbaAtiva, "single", e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs md:text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-600"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                              Duplo (2 pessoas)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              value={tarifaValores[regimeAbaAtiva]?.duplo || ""}
                              onChange={(e) => handleValorTarifaChange(regimeAbaAtiva, "duplo", e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs md:text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-600"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                              Adic. Adulto (3º+)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              value={tarifaValores[regimeAbaAtiva]?.adicAdulto || ""}
                              onChange={(e) => handleValorTarifaChange(regimeAbaAtiva, "adicAdulto", e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs md:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                              Adic. Criança (extra)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              value={tarifaValores[regimeAbaAtiva]?.adicCrianca || ""}
                              onChange={(e) => handleValorTarifaChange(regimeAbaAtiva, "adicCrianca", e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs md:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={salvarNovaTarifa}
                          disabled={salvandoTarifa}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {salvandoTarifa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          <span>Adicionar Tarifa à Tabela</span>
                        </button>
                      </div>
                    </div>

                    {/* REGRAS DE CRIANÇAS */}
                    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <Baby className="w-4 h-4 text-brand-700" />
                            Regras Automáticas de Crianças
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Aplicadas automaticamente pelo motor de cálculo conforme as idades informadas no orçamento.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={salvarRegrasCriancas}
                          className="bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
                        >
                          Salvar Regras de Crianças
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-slate-800 uppercase block">1. Cortesia Padrão</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                                Qtd Máxima de Cortesias
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={regrasCriancas.qtdMaximaCortesia}
                                onChange={(e) => setRegrasCriancas((prev) => ({ ...prev, qtdMaximaCortesia: e.target.value }))}
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                                Idade Máxima Cortesia
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={regrasCriancas.idadeMaximaCortesia}
                                onChange={(e) => setRegrasCriancas((prev) => ({ ...prev, idadeMaximaCortesia: e.target.value }))}
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase block">2. Faixa Escalonada (Opcional)</span>
                            <ToggleSwitch
                              ativo={regrasCriancas.ativarFaixa2}
                              onToggle={() => setRegrasCriancas((prev) => ({ ...prev, ativarFaixa2: !prev.ativarFaixa2 }))}
                              label="Ativar faixa escalonada"
                            />
                          </div>

                          {regrasCriancas.ativarFaixa2 && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">De (anos)</label>
                                <input
                                  type="number"
                                  value={regrasCriancas.faixa2Min}
                                  onChange={(e) => setRegrasCriancas((prev) => ({ ...prev, faixa2Min: e.target.value }))}
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Até (anos)</label>
                                <input
                                  type="number"
                                  value={regrasCriancas.faixa2Max}
                                  onChange={(e) => setRegrasCriancas((prev) => ({ ...prev, faixa2Max: e.target.value }))}
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Cobrar % Adic.</label>
                                <input
                                  type="number"
                                  value={regrasCriancas.faixa2Percentual}
                                  onChange={(e) => setRegrasCriancas((prev) => ({ ...prev, faixa2Percentual: e.target.value }))}
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* GESTÃO DO CALENDÁRIO COM CORES DISTINTAS */}
                    <TabelaGestaoCalendario 
                      tarifas={tarifasCadastradas} 
                      tiposApto={tiposApto}
                      onEditarTarifa={abrirModalEditarTarifa}
                      onExcluirTarifa={excluirTarifa}
                    />
                  </>
                )}
              </div>
            )}

            {/* AÇÕES FINAIS (RODAPÉ) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {abaAtiva !== "sobre" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (abaAtiva === "videos") mudarAba("sobre");
                      if (abaAtiva === "fotos") mudarAba("videos");
                      if (abaAtiva === "apartamentos") mudarAba("fotos");
                      if (abaAtiva === "tarifario") mudarAba("apartamentos");
                    }}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                  >
                    ← Aba Anterior
                  </button>
                )}
                {abaAtiva !== (temPermissaoTarifario ? "tarifario" : "apartamentos") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (abaAtiva === "sobre") mudarAba("videos");
                      if (abaAtiva === "videos") mudarAba("fotos");
                      if (abaAtiva === "fotos") mudarAba("apartamentos");
                      if (abaAtiva === "apartamentos" && temPermissaoTarifario) mudarAba("tarifario");
                    }}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                  >
                    Próxima Aba →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-brand-900 hover:bg-brand-950 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm transition shadow flex items-center gap-2 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{salvando ? "Salvando Hotel..." : hotelEditandoId ? "Atualizar Hotel" : "Gravar Hotel Completo"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* MODAL POP-UP DE EDIÇÃO INDIVIDUAL DA TARIFA */}
      {modalEditarTarifaAberto && tarifaEmEdicaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {tarifaEmEdicaoModal.isExcecaoDiaria ? "Editar Valor Específico do Dia" : "Editar Tarifa"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tarifaEmEdicaoModal.isExcecaoDiaria 
                      ? "Alterará apenas o valor deste dia sem modificar os demais dias do período."
                      : "Modifique os valores aplicados a este período."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalEditarTarifaAberto(false);
                  setTarifaEmEdicaoModal(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Nome da Tarifa</label>
                <input
                  type="text"
                  list="lista-nomes-tarifas-modal"
                  value={tarifaEmEdicaoModal.nome}
                  onChange={(e) => setTarifaEmEdicaoModal((prev) => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 uppercase"
                />
                <datalist id="lista-nomes-tarifas-modal">
                  {nomesTarifasCatalogo.map((nm) => (
                    <option key={nm} value={nm} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Início</label>
                <input
                  type="date"
                  min={hojeIso}
                  disabled={tarifaEmEdicaoModal.isExcecaoDiaria}
                  value={tarifaEmEdicaoModal.dataInicio}
                  onChange={(e) => setTarifaEmEdicaoModal((prev) => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Fim</label>
                <input
                  type="date"
                  min={tarifaEmEdicaoModal.dataInicio || hojeIso}
                  disabled={tarifaEmEdicaoModal.isExcecaoDiaria}
                  value={tarifaEmEdicaoModal.dataFim}
                  onChange={(e) => setTarifaEmEdicaoModal((prev) => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-60"
                />
              </div>

              {/* Dias da semana */}
              {!tarifaEmEdicaoModal.isExcecaoDiaria && (
                <div className="md:col-span-12 space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase block">Dias da Semana Ativos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA_NOMES.map((d) => {
                      const ativo = tarifaEmEdicaoModal.diasSemana?.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            const novos = ativo 
                              ? tarifaEmEdicaoModal.diasSemana.filter((x) => x !== d.id) 
                              : [...tarifaEmEdicaoModal.diasSemana, d.id];
                            setTarifaEmEdicaoModal((prev) => ({ ...prev, diasSemana: novos }));
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                            ativo ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matriz de Preços no Modal */}
              <div className="md:col-span-12 space-y-2 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-800 uppercase block">Valores por Regime:</label>
                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                  {REGIMES_LISTA.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setTarifaEmEdicaoModal((prev) => ({ ...prev, regimeAtivo: r.id }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        (tarifaEmEdicaoModal.regimeAtivo || "cafe") === r.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["single", "duplo", "adicAdulto", "adicCrianca"].map((campo) => {
                    const regimeAtual = tarifaEmEdicaoModal.regimeAtivo || "cafe";
                    const labels = {
                      single: "Single (1 Pax)",
                      duplo: "Duplo (2 Pax)",
                      adicAdulto: "Ad. Adulto",
                      adicCrianca: "Ad. Criança",
                    };
                    return (
                      <div key={campo}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          {labels[campo]}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={tarifaEmEdicaoModal.valores[regimeAtual]?.[campo] || ""}
                          onChange={(e) => {
                            const formatado = formatarMoedaInput(e.target.value);
                            setTarifaEmEdicaoModal((prev) => ({
                              ...prev,
                              valores: {
                                ...prev.valores,
                                [regimeAtual]: {
                                  ...prev.valores[regimeAtual],
                                  [campo]: formatado,
                                },
                              },
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-amber-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setModalEditarTarifaAberto(false);
                  setTarifaEmEdicaoModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarTarifaPeloModal}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA GERENCIAR (CRIAR E RENOMEAR) NOMES DE TARIFAS */}
      {modalRenomearAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Catálogo de Nomes</h3>
                  <p className="text-xs text-slate-500">Cadastre ou renomeie nomes de tarifas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRenomearAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELETOR DE ABAS DO CATÁLOGO: NOVO NOME OU RENOMEAR */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setAbaModalCatalogo("novo")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                  abaModalCatalogo === "novo"
                    ? "border-amber-600 text-amber-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                + Criar Novo Nome
              </button>
              <button
                type="button"
                onClick={() => setAbaModalCatalogo("renomear")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                  abaModalCatalogo === "renomear"
                    ? "border-amber-600 text-amber-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Renomear Existente
              </button>
            </div>

            {/* ABA 1: CRIAR NOVO NOME */}
            {abaModalCatalogo === "novo" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Novo Nome de Tarifa / Temporada *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ALTA TEMPORADA, SUPER BAIXA..."
                    value={novoNomeCatalogo}
                    onChange={(e) => setNovoNomeCatalogo(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        salvarNovoNomeCatalogo();
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Esse nome ficará salvo no catálogo deste hotel e aparecerá nas sugestões e no dropdown de cadastro.
                </p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalRenomearAberto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={renomeandoMassa}
                    onClick={salvarNovoNomeCatalogo}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow disabled:opacity-50"
                  >
                    {renomeandoMassa ? "Salvando..." : "Salvar no Catálogo"}
                  </button>
                </div>
              </div>
            )}

            {/* ABA 2: RENOMEAR EXISTENTE */}
            {abaModalCatalogo === "renomear" && (
              <div className="space-y-3 pt-1">
                {nomesTarifasCatalogo.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">Nenhum nome cadastrado ainda.</p>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                        Nome Atual Cadastrado
                      </label>
                      <select
                        value={nomeParaRenomearAntigo}
                        onChange={(e) => {
                          setNomeParaRenomearAntigo(e.target.value);
                          setNomeParaRenomearNovo(e.target.value);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 uppercase"
                      >
                        {nomesTarifasCatalogo.map((nm) => (
                          <option key={nm} value={nm}>
                            {nm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                        Novo Nome Desejado
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: BAIXA TEMPORADA, ALTA TEMPORADA..."
                        value={nomeParaRenomearNovo}
                        onChange={(e) => setNomeParaRenomearNovo(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-600 uppercase"
                      />
                    </div>

                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Ao alterar, todas as tarifas que utilizam o nome antigo serão atualizadas automaticamente para o novo nome.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setModalRenomearAberto(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={renomeandoMassa}
                        onClick={executarRenomeacaoMassa}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow disabled:opacity-50"
                      >
                        {renomeandoMassa ? "Atualizando..." : "Aplicar Novo Nome"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA E CONFIRMAÇÃO */}
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
                    onClick={async () => {
                      const acao = modalConfig.onConfirm;
                      fecharModal();
                      if (acao) await acao();
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
