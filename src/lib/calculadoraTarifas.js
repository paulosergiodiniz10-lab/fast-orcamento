/**
 * Motor de Cálculo Tarifário - Fast Orçamento
 * Módulo inteligente: responsável pelo cálculo de diárias/noites, travas de pacote,
 * sobreposição de regras (dias específicos sobre dias gerais), regras de crianças e descontos.
 */

export const REGIMES_SUPORTADOS = [
  { id: "sem_refeicao", label: "Sem refeições" },
  { id: "cafe", label: "Café da Manhã" },
  { id: "cafe_almoco", label: "Café + Almoço" },
  { id: "cafe_jantar", label: "Café + Jantar" },
  { id: "pensao_completa", label: "Pensão Completa" },
];

/**
 * Converte string 'YYYY-MM-DD' para objeto Date local (sem interferência de fuso horário UTC)
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
 * Exemplo: 23/10 a 25/10 retorna ['2026-10-23', '2026-10-24'] (2 noites).
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
 */
export function validarRegrasDePacote(noitesEstadia, tarifas) {
  if (!noitesEstadia.length) {
    return { valido: false, mensagem: "Período inválido de hospedagem." };
  }

  for (const tarifa of tarifas) {
    if (!tarifa.ativo) continue;

    const { dataInicio, dataFim, minimoNoites, pacoteFechado, nome, diasSemana } = tarifa;
    if (!dataInicio || !dataFim) continue;

    // As noites que compõem o período cadastrado da tarifa
    const noitesDoPeriodo = obterNoitesEstadia(dataInicio, dataFim);

    // Noites ativas do pacote considerando os dias da semana permitidos
    const noitesObrigatoriasPacote = noitesDoPeriodo.filter((noiteStr) => {
      if (!diasSemana || diasSemana.length === 0) return true;
      const diaSem = converterParaDataLocal(noiteStr).getDay();
      return diasSemana.includes(diaSem);
    });

    // Verifica se a estadia do cliente toca em qualquer noite válida desta tarifa
    const tocaPeriodo = noitesEstadia.some(
      (noite) => noite >= dataInicio && noite < dataFim
    );

    if (tocaPeriodo) {
      // 1. Regra de Mínimo de Noites geral
      if (minimoNoites && noitesEstadia.length < minimoNoites) {
        return {
          valido: false,
          mensagem: `O período de "${nome || "Tarifa"}" exige no mínimo ${minimoNoites} noites. Seu período possui ${noitesEstadia.length} noite(s).`,
        };
      }

      // 2. Regra de Pacote Fechado:
      // Exige a contratação integral de todas as noites pertencentes ao pacote
      if (pacoteFechado && noitesObrigatoriasPacote.length > 0) {
        const cobriuTodasNoites = noitesObrigatoriasPacote.every((noitePacote) =>
          noitesEstadia.includes(noitePacote)
        );

        if (!cobriuTodasNoites) {
          const inicioBr = dataInicio.split("-").reverse().join("/");
          const fimBr = dataFim.split("-").reverse().join("/");
          return {
            valido: false,
            mensagem: `O período de ${inicioBr} a ${fimBr} (${nome || "Pacote Fechado"}) exige a reserva completa de todas as noites do pacote.`,
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
    faixaAdicional = null,
  } = regrasCriancas;

  let cortesiasUtilizadas = 0;

  idadesCriancas.forEach((idade) => {
    const idadeNum = Number(idade);

    if (idadeNum <= idadeMaximaCortesia && cortesiasUtilizadas < qtdMaximaCortesia) {
      cortesiasUtilizadas += 1;
    } else if (
      faixaAdicional &&
      idadeNum >= faixaAdicional.idadeMin &&
      idadeNum <= faixaAdicional.idadeMax
    ) {
      const baseCobrada = adicCrianca > 0 ? adicCrianca : adicAdulto;
      const percentual = (faixaAdicional.percentual || 100) / 100;
      valorTotalNoite += baseCobrada * percentual;
    } else {
      valorTotalNoite += adicCrianca > 0 ? adicCrianca : adicAdulto;
    }
  });

  return valorTotalNoite;
}

/**
 * Função Principal de Cálculo da Estadia Completa
 */
export function calcularTarifasEstadia({
  checkin,
  checkout,
  qtdAdultos = 2,
  idadesCriancas = [],
  tarifasHotel = [],
  regrasCriancas = {},
  acomodacaoEscolhida = null,
  desconto = { tipo: "porcentagem", valor: 0 },
}) {
  const noites = obterNoitesEstadia(checkin, checkout);

  if (!noites.length) {
    return {
      sucesso: false,
      mensagem: "Datas de check-in e check-out inválidas.",
      valoresPorRegime: {},
    };
  }

  // 1. Validação de bloqueios, mínimos de noites e pacotes fechados
  const validacao = validarRegrasDePacote(noites, tarifasHotel);
  if (!validacao.valido) {
    return {
      sucesso: false,
      mensagem: validacao.mensagem,
      valoresPorRegime: {},
    };
  }

  const acumuladoRegimes = {};

  REGIMES_SUPORTADOS.forEach((r) => {
    acumuladoRegimes[r.id] = { total: 0, noitesCalculadas: 0, existeTarifa: false };
  });

  // 2. Loop Noite a Noite com Sobreposição Inteligente
  for (const noiteStr of noites) {
    const dataObj = converterParaDataLocal(noiteStr);
    const diaDaSemana = dataObj.getDay();

    // Filtra todas as tarifas ativas que cobrem esta noite específica
    const tarifasCompativeis = tarifasHotel.filter((t) => {
      if (!t.ativo) return false;
      const dentroDaData = noiteStr >= t.dataInicio && noiteStr <= t.dataFim;
      const diaPermitido = !t.diasSemana || t.diasSemana.includes(diaDaSemana);

      const aptoCompativel =
        !acomodacaoEscolhida ||
        !t.aptoVinculado ||
        t.aptoVinculado === "todos" ||
        t.aptoVinculado === acomodacaoEscolhida;

      return dentroDaData && diaPermitido && aptoCompativel;
    });

    if (tarifasCompativeis.length > 0) {
      // Regra de Sobreposição e Desempate:
      // 1º Quarto específico tem prioridade sobre "todos"
      // 2º Pacote fechado tem prioridade sobre tarifa comum
      // 3º Regra com menos dias na semana (ex: Final de Semana com 2 ou 3 dias)
      //    sobrepõe regra geral (ex: Baixa Temporada de 7 dias)
      tarifasCompativeis.sort((a, b) => {
        const pesoAptoA = a.aptoVinculado && a.aptoVinculado !== "todos" ? 4 : 0;
        const pesoAptoB = b.aptoVinculado && b.aptoVinculado !== "todos" ? 4 : 0;

        const pesoPacoteA = a.pacoteFechado ? 2 : 0;
        const pesoPacoteB = b.pacoteFechado ? 2 : 0;

        const especificidadeDiasA = 7 - (a.diasSemana?.length || 7);
        const especificidadeDiasB = 7 - (b.diasSemana?.length || 7);

        const scoreA = pesoAptoA + pesoPacoteA + especificidadeDiasA;
        const scoreB = pesoAptoB + pesoPacoteB + especificidadeDiasB;

        return scoreB - scoreA;
      });

      const tarifaVencedora = tarifasCompativeis[0];

      REGIMES_SUPORTADOS.forEach((reg) => {
        const valorNoite = calcularValorNoitePorRegime({
          tarifaNoite: tarifaVencedora,
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

  // 3. Aplicação de Desconto e formatação final
  const totalNoitesEstadia = noites.length;
  const resultadoFormatado = {};

  REGIMES_SUPORTADOS.forEach((reg) => {
    const info = acumuladoRegimes[reg.id];

    if (info.existeTarifa && info.noitesCalculadas === totalNoitesEstadia) {
      let valorFinal = info.total;

      const valorDescNum = Math.abs(parseFloat(desconto?.valor)) || 0;
      if (valorDescNum > 0) {
        if (desconto.tipo === "porcentagem") {
          const perc = Math.min(Math.max(valorDescNum, 0), 100);
          valorFinal = valorFinal * (1 - perc / 100);
        } else if (desconto.tipo === "valor") {
          valorFinal = Math.max(valorFinal - valorDescNum, 0);
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
