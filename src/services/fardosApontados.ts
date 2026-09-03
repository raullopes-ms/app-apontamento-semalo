import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@prodbip:fardosApontados";

const VALIDADE_MS = 24 * 60 * 60 * 1000;

type FardoApontado = {
  id: number;
  idiProc: number;
  em: number;
};

async function ler(): Promise<FardoApontado[]> {
  try {
    const bruto = await AsyncStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];

    const registros = JSON.parse(bruto) as FardoApontado[];
    if (!Array.isArray(registros)) return [];

    const limite = Date.now() - VALIDADE_MS;
    return registros.filter(
      (item) =>
        typeof item?.id === "number" &&
        typeof item?.idiProc === "number" &&
        typeof item?.em === "number" &&
        item.em > limite,
    );
  } catch {
    return [];
  }
}

async function gravar(registros: FardoApontado[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  } catch {}
}

export async function marcarFardosApontados(idiProc: number, ids: number[]) {
  if (ids.length === 0) return;

  const registros = await ler();
  const conhecidos = new Set(registros.map((item) => item.id));
  const em = Date.now();

  const novos: FardoApontado[] = [];
  for (const id of ids) {
    if (conhecidos.has(id)) continue;
    conhecidos.add(id);
    novos.push({ id, idiProc, em });
  }

  if (novos.length === 0) return;

  await gravar([...registros, ...novos]);
}

export async function listarFardosApontados(
  idiProc: number,
): Promise<number[]> {
  const registros = await ler();
  return registros
    .filter((item) => item.idiProc === idiProc)
    .map((item) => item.id);
}

export async function esquecerFardosApontados(ids: number[]) {
  if (ids.length === 0) return;

  const registros = await ler();
  const paraEsquecer = new Set(ids);
  await gravar(registros.filter((item) => !paraEsquecer.has(item.id)));
}
