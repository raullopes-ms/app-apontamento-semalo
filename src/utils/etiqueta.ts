const TAMANHO_COD_PRODUTO = 5;
const TAMANHO_DATA = 6;
const TAMANHO_LOTE = 6;
const TAMANHO_SEQUENCIA_LOTE = 5;
const TAMANHO_ETIQUETA =
  TAMANHO_COD_PRODUTO +
  TAMANHO_DATA * 2 +
  TAMANHO_LOTE +
  TAMANHO_SEQUENCIA_LOTE;

export type EtiquetaProducao = {
  codProd: number;
  dataProducao: Date;
  dataValidade: Date;
  lote: string;
  sequenciaLote: string;
};

function parseDataAammdd(valor: string): Date | null {
  const ano = 2000 + Number(valor.slice(0, 2));
  const mes = Number(valor.slice(2, 4));
  const dia = Number(valor.slice(4, 6));
  const data = new Date(ano, mes - 1, dia);

  const valida =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  return valida ? data : null;
}

export function parseEtiqueta(codigo: string): EtiquetaProducao | null {
  const etiqueta = codigo.replace(/[\s\u0000-\u001f]+$/, "");

  if (
    etiqueta.length !== TAMANHO_ETIQUETA ||
    !/^.{5}\d{12}[A-Za-z0-9]{11}$/.test(etiqueta)
  ) {
    return null;
  }

  let offset = 0;
  const codProdStr = etiqueta.slice(offset, (offset += TAMANHO_COD_PRODUTO));
  const dataProducaoStr = etiqueta.slice(offset, (offset += TAMANHO_DATA));
  const dataValidadeStr = etiqueta.slice(offset, (offset += TAMANHO_DATA));
  const lote = etiqueta.slice(offset, (offset += TAMANHO_LOTE));
  const sequenciaLote = etiqueta.slice(offset, offset + TAMANHO_SEQUENCIA_LOTE);

  const codProdSemPadding = codProdStr.replace(/\D/g, "");

  if (!codProdSemPadding) return null;

  const codProdDigitos = codProdSemPadding.padStart(TAMANHO_COD_PRODUTO, "0");

  const dataProducao = parseDataAammdd(dataProducaoStr);
  const dataValidade = parseDataAammdd(dataValidadeStr);
  if (!dataProducao || !dataValidade) return null;

  return {
    codProd: Number(codProdDigitos),
    dataProducao,
    dataValidade,
    lote,
    sequenciaLote,
  };
}

export type DadosEtiqueta = {
  producao?: string;
  validade?: string;
  lote?: string;
  seqlote?: string;
};

export function dadosDaEtiqueta(etiqueta: EtiquetaProducao): DadosEtiqueta {
  return {
    producao: formatarDataIso(etiqueta.dataProducao),
    validade: formatarDataIso(etiqueta.dataValidade),
    lote: etiqueta.lote,
    seqlote: etiqueta.sequenciaLote,
  };
}

export function dadosDoFardo(fardo: {
  producao: string | null;
  validade: string | null;
  lote: string | null;
  seqlote: string | null;
}): DadosEtiqueta {
  return {
    producao: fardo.producao ?? undefined,
    validade: fardo.validade ?? undefined,
    lote: fardo.lote ?? undefined,
    seqlote: fardo.seqlote ?? undefined,
  };
}

export function identidadeDaEtiqueta(etiqueta: EtiquetaProducao): string {
  return `${etiqueta.codProd}|${etiqueta.lote.trim()}|${etiqueta.sequenciaLote.trim()}`;
}

export function identidadeDoFardoPendente(fardo: {
  codprod: string;
  lote: string | null;
  seqlote: string | null;
}): string | null {
  const lote = fardo.lote?.trim();
  const seqlote = fardo.seqlote?.trim();

  if (!lote || !seqlote) return null;

  return `${Number(fardo.codprod)}|${lote}|${seqlote}`;
}

export function temDadosDeEtiqueta(dados: DadosEtiqueta): boolean {
  return Boolean(
    dados.producao || dados.validade || dados.lote || dados.seqlote,
  );
}

export function etiquetaEhValida(
  etiqueta: string | null | undefined,
): etiqueta is string {
  const valor = (etiqueta ?? "").trim().toLowerCase();
  return valor !== "" && valor !== "null" && valor !== "undefined";
}

export function mesmaEtiqueta(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export function codigoProdutoCorresponde(
  etiqueta: EtiquetaProducao,
  codProdOp: number,
): boolean {
  return etiqueta.codProd === codProdOp;
}

export function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
