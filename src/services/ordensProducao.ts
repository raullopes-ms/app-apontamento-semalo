import { OrdemProducao } from "../components/OrdemProducaoCard";
import { api } from "./api";

type OrdensProducaoResponse = {
  ordensProducao: OrdemProducao[];
};

export async function getOrdensProducao(codEmp: number) {
  const { data } = await api.get<OrdensProducaoResponse>(
    `/ordens-producao/${codEmp}`,
  );

  return data.ordensProducao;
}
