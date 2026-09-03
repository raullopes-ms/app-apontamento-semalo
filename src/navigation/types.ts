import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OrdemProducao } from "../components/OrdemProducaoCard";

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Bipagem: { ordem: OrdemProducao };
  Apontamento: { ordem: OrdemProducao; etiqueta: string };
};

export type AuthScreenProps<Screen extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, Screen>;

export type AppScreenProps<Screen extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, Screen>;
