/**
 * Motor de Cálculo Tarifário - Fast Orçamento
 * Módulo isolado: responsável pelo cálculo de diárias/noites, travas de pacote,
 * regras de crianças/hóspedes extras e aplicação de descontos pontuais.
 */

export const REGIMES_SUPORTADOS = [
  { id: "sem_refeicao", label: "Sem refeições" },
  { id: "cafe", label: "Café da Manhã" },
  { id: "cafe_almoco", label: "Café + Almoço" },
  { id: "cafe_jantar", label: "Café + Jantar" },
  { id: "pensao_completa", label: "Pensão Completa" },
];

/**
 * Converte string 'YYYY-MM-DD' para objeto Date local (sem interferência de fuso horário)
 */
export function converterParaDataLocal(dataStr) {
  if (!dataStr) return null;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Formata um objeto Date para 'YYYY-MM-DD'
 */
export function formatarParaDataIso(dateObj) {
  const ano = dateObj.getFullYear();
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dia = String(dateObj.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Retorna uma lista de strings 'YYYY-MM-DD' representando cada NOITE da estadia.
 * REGRA HOTELEIRA: Não inclui o dia do checkout.
 * Exemplo: 23/10 a 25/10 retorna ['2026-10-23', '2026-10-24'] (total: 2 noites).
 */
export function obterNoitesEstadia(checkinStr, checkoutStr) {
  const dataIn = converterParaDataLocal(checkinStr);
  const dataOut = converterParaDataLocal(checkoutStr);

  if (!dataIn || !dataOut || dataIn >= dataOut) {
    return [];
  }

  const noites = [];
  const atual = new Date(dataIn.getTime());

  while (atual < dataOut) {
    noites.push(formatarParaDataIso(atual));
    atual.setDate(atual.getDate() + 1);
  }

  return noites;
}

/**
 * Valida regras de Mínimo de Noites e Pacotes Fechados
 * @param {Array} noitesEstadia Lista de datas 'YYYY-MM-DD'
 * @param {Array} tarifas Lista de tarifas cadastradas do hotel
 * @returns {Object} { valido: boolean, mensagem: string }
 */
export function validarRegrasDePacote(noitesEstadia, tarifas) {
  if (!noitesEstadia.length) {
    return { valido: false, mensagem: "Período inválido de hospedagem." };
  }

  const checkinData = noitesEstadia[0];
  const checkoutData = noitesEstadia[noitesEstadia.length - 1];

  for (const tarifa of tarifas) {
    if (!tarifa.ativo) continue;

    const { dataInicio, dataFim, minimoNoites, pacoteFechado, nome } = tarifa;

    // Verifica se a estadia cruza com o período da tarifa/pacote
    const tocaPeriodo = noitesEstadia.some(
      (noite) => noite >= dataInicio && noite <= dataFim
    );

    if (tocaPeriodo) {
      // 1. Validação de Mínimo de Noites
      if (minimoNoites && noitesEstadia.length < minimoNoites) {
        return {
          valido: false,
          mensagem: `A tarifa "${nome || "Especial"}" exige no mínimo ${minimoNoites} noites. Seu período possui apenas ${noitesEstadia.length} noite(s).`,
        };
      }

      // 2. Validação de Pacote Fechado (Ex: Feriado obrigatório de 23 a 25/10)
      if (pacoteFechado && dataInicio && dataFim) {
        const pacoteIniciouDepois = checkinData > dataInicio;
        const pacoteTerminouAntes = checkoutData < dataFim;

        // Se o cliente tentar começar depois da data obrigatória ou sair antes, bloqueia
        if (pacoteIniciouDepois || pacoteTerminouAntes) {
          return {
            valido: false,
            mensagem: `Existe um pacote fechado (${nome || "Feriado/Evento"}) de ${dataInicio} a ${dataFim}. Não é permitido quebrar o período central do pacote.`,
          };
        }
      }
    }
  }

  return { valido: true, mensagem: "" };
}

/**
 * Calcula o valor de ocupação para uma única noite com base na quantidade de hóspedes e regras
 */
export function calcularValorNoitePorRegime({
  tarifaNoite,
  regimeId,
  qtdAdultos = 2,
  idadesCriancas = [],
  regrasCriancas = {},
}) {
  const precosRegime = tarifaNoite?.valores?.[regimeId];
  if (!precosRegime) return null;

  const { single = 0, duplo = 0, adicAdulto = 0, adicCrianca = 0 } = precosRegime;

  let valorTotalNoite = 0;

  // 1. Base por adultos
  if (qtdAdultos <= 1) {
    valorTotalNoite += single > 0 ? single : duplo;
  } else {
    valorTotalNoite += duplo;
    if (qtdAdultos > 2) {
      const adultosExtras = qtdAdultos - 2;
      valorTotalNoite += adultosExtras * (adicAdulto || 0);
    }
  }

  // 2. Regra de Crianças
  const {
    idadeMaximaCortesia = 12,
    qtdMaximaCortesia = 2,
    faixaAdicional = null, // ex: { idadeMin: 13, idadeMax: 17, percentual: 50 }
  } = regrasCriancas;

  let cortesiasUtilizadas = 0;

  idadesCriancas.forEach((idade) => {
    const idadeNum = Number(idade);

    // Verifica se se qualifica para cortesia
    if (idadeNum <= idadeMaximaCortesia && cortesiasUtilizadas < qtdMaximaCortesia) {
      cortesiasUtilizadas += 1;
    } else if (
      faixaAdicional &&
      idadeNum >= faixaAdicional.idadeMin &&
      idadeNum <= faixaAdicional.idadeMax
    ) {
      // Cobra percentual do adicional adulto ou criança
      const baseCobrada = adicCrianca > 0 ? adicCrianca : adicAdulto;
      const percentual = (faixaAdicional.percentual || 100) / 100;
      valorTotalNoite += baseCobrada * percentual;
    } else {
      // Cobra adicional criança integral
      valorTotalNoite += adicCrianca > 0 ? adicCrianca : adicAdulto;
    }
  });

  return valorTotalNoite;
}

/**
 * Função Principal de Cálculo da Estadia Completa
 * Retorna os totais somados noite a noite para cada regime disponível
 */
export function calcularTarifasEstadia({
  checkin,
  checkout,
  qtdAdultos = 2,
  idadesCriancas = [],
  tarifasHotel = [],
  regrasCriancas = {},
  desconto = { tipo: "porcentagem", valor: 0 }, // tipo: 'porcentagem' ou 'valor'
}) {
  const noites = obterNoitesEstadia(checkin, checkout);

  if (!noites.length) {
    return {
      sucesso: false,
      mensagem: "Datas de check-in e check-out inválidas.",
      valoresPorRegime: {},
    };
  }

  // 1. Validação de bloqueios e mínimos de noites
  const validacao = validarRegrasDePacote(noites, tarifasHotel);
  if (!validacao.valido) {
    return {
      sucesso: false,
      mensagem: validacao.mensagem,
      valoresPorRegime: {},
    };
  }

  const acumuladoRegimes = {};

  // Inicializa regimes suportados
  REGIMES_SUPORTADOS.forEach((r) => {
    acumuladoRegimes[r.id] = { total: 0, noitesCalculadas: 0, existeTarifa: false };
  });

  // 2. Loop Noite a Noite
  for (const noiteStr of noites) {
    const dataObj = converterParaDataLocal(noiteStr);
    const diaDaSemana = dataObj.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab

    // Encontra a tarifa que cobre este dia
    const tarifaAplicavel = tarifasHotel.find((t) => {
      if (!t.ativo) return false;
      const dentroDaData = noiteStr >= t.dataInicio && noiteStr <= t.dataFim;
      const diaPermitido = !t.diasSemana || t.diasSemana.includes(diaDaSemana);
      return dentroDaData && diaPermitido;
    });

    if (tarifaAplicavel) {
      REGIMES_SUPORTADOS.forEach((reg) => {
        const valorNoite = calcularValorNoitePorRegime({
          tarifaNoite: tarifaAplicavel,
          regimeId: reg.id,
          qtdAdultos,
          idadesCriancas,
          regrasCriancas,
        });

        if (valorNoite !== null && valorNoite > 0) {
          acumuladoRegimes[reg.id].total += valorNoite;
          acumuladoRegimes[reg.id].noitesCalculadas += 1;
          acumuladoRegimes[reg.id].existeTarifa = true;
        }
      });
    }
  }

  // 3. Aplicação de Desconto Geral (se houver) e formatação
  const totalNoitesEstadia = noites.length;
  const resultadoFormatado = {};

  REGIMES_SUPORTADOS.forEach((reg) => {
    const info = acumuladoRegimes[reg.id];

    // Só exibe o regime se todas as noites do período tiveram tarifa cadastrada
    if (info.existeTarifa && info.noitesCalculadas === totalNoitesEstadia) {
      let valorFinal = info.total;

      if (desconto && Number(desconto.valor) > 0) {
        if (desconto.tipo === "porcentagem") {
          const perc = Math.min(Math.max(Number(desconto.valor), 0), 100);
          valorFinal = valorFinal * (1 - perc / 100);
        } else if (desconto.tipo === "valor") {
          valorFinal = Math.max(valorFinal - Number(desconto.valor), 0);
        }
      }

      resultadoFormatado[reg.id] = valorFinal.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  });

  return {
    sucesso: true,
    totalNoites: totalNoitesEstadia,
    valoresPorRegime: resultadoFormatado,
  };
}
