import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@prodbip:apontamentoEmAndamento";

const VALIDADE_MS = 24 * 60 * 60 * 1000;

export type ApontamentoEmAndamento = {
  idiProc: number;
  idiAtv: number;
  codProd: number;
  qtdProd: number;
  etiqueta: string;
  dum: string;
  nuapo: number;

  nunota?: number;

  salvo?: boolean;

  fardoIds: number[];

  producao?: string;
  validade?: string;
  lote?: string;
  seqlote?: string;
  em: number;
};

function ehValido(registro: unknown): registro is ApontamentoEmAndamento {
  const item = registro as ApontamentoEmAndamento | null;
  return (
    typeof item?.idiProc === "number" &&
    typeof item.idiAtv === "number" &&
    typeof item.nuapo === "number" &&
    typeof item.em === "number" &&
    Array.isArray(item.fardoIds)
  );
}

async function ler(): Promise<ApontamentoEmAndamento[]> {
  try {
    const bruto = await AsyncStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];

    const registros = JSON.parse(bruto) as unknown;
    if (!Array.isArray(registros)) return [];

    const limite = Date.now() - VALIDADE_MS;
    return registros.filter(
      (item) => ehValido(item) && item.em > limite,
    ) as ApontamentoEmAndamento[];
  } catch {
    return [];
  }
}

async function gravar(registros: ApontamentoEmAndamento[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export async function salvarApontamentoEmAndamento(
  registro: Omit<ApontamentoEmAndamento, "em">,
): Promise<ApontamentoEmAndamento> {
  const atual: ApontamentoEmAndamento = { ...registro, em: Date.now() };

  const registros = await ler();

  await gravar([
    ...registros.filter((item) => item.idiProc !== atual.idiProc),
    atual,
  ]);

  return atual;
}

export async function lerApontamentoEmAndamento(
  idiProc: number,
): Promise<ApontamentoEmAndamento | null> {
  const registros = await ler();
  return registros.find((item) => item.idiProc === idiProc) ?? null;
}

export async function limparApontamentoEmAndamento(idiProc: number) {
  const registros = await ler();
  const restantes = registros.filter((item) => item.idiProc !== idiProc);
  if (restantes.length === registros.length) return;

  await gravar(restantes);
}
