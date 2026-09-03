import { ChevronLeft } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TextInputSubmitEditingEventData,
  NativeSyntheticEvent,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { AppScreenProps } from "../navigation/types";

type BipagemProps = AppScreenProps<"Bipagem">;

export function Bipagem({ route, navigation }: BipagemProps) {
  const { ordem } = route.params;
  const insets = useSafeAreaInsets();
  const [aguardandoLeitura, setAguardandoLeitura] = useState(false);
  const [etiquetaCapturada, setEtiquetaCapturada] = useState("");
  const scannerInputRef = useRef<TextInput>(null);

  function handleCapturarEtiqueta() {
    setEtiquetaCapturada("");
    setAguardandoLeitura(true);
    scannerInputRef.current?.clear();
    scannerInputRef.current?.focus();
  }

  function handleLeituraConcluida(
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) {
    const codigo = e.nativeEvent.text.trim();
    setAguardandoLeitura(false);
    setEtiquetaCapturada(codigo);
    scannerInputRef.current?.clear();
    scannerInputRef.current?.blur();

    if (codigo) {
      navigation.navigate("Apontamento", { ordem, etiqueta: codigo });
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={["top"]} className="bg-orange-600">
        <View className="flex-row items-center gap-3 px-6 pb-4 pt-2">
          <IconButton icon={ChevronLeft} onPress={navigation.goBack} />
          <Text className="flex-1 text-lg font-semibold text-white">
            Etiqueta
          </Text>
        </View>
      </SafeAreaView>

      <View className="gap-4 p-6" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="rounded-xl border border-slate-200 bg-white p-4">
          <Text className="mb-3 text-base font-semibold text-slate-900">
            OP {ordem.idiProc}
          </Text>
          <Text className="text-sm font-medium text-slate-800">
            {ordem.descrProd}
          </Text>
          <Text className="mb-3 text-xs text-slate-500">
            Código: {ordem.codProd}
          </Text>

          <View className="flex-row flex-wrap gap-y-2">
            <View className="w-1/2">
              <Text className="text-xs text-slate-500">
                Quantidade a Produzir
              </Text>
              <Text className="text-sm text-slate-800">
                {ordem.qtdProduzir}
              </Text>
            </View>
            <View className="w-1/2">
              <Text className="text-xs text-slate-500">Capacidade</Text>
              <Text className="text-sm text-slate-800">{ordem.qtdPallet}</Text>
            </View>
          </View>
        </View>

        <Button
          title="Capturar Etiqueta"
          onPress={handleCapturarEtiqueta}
          disabled={aguardandoLeitura}
        />

        {aguardandoLeitura ? (
          <View className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-50 p-3">
            <ActivityIndicator color="#d97706" />
            <Text className="text-sm font-medium text-amber-700">
              Aguardando leitura da etiqueta...
            </Text>
          </View>
        ) : null}

        {!aguardandoLeitura && etiquetaCapturada ? (
          <View className="rounded-xl bg-emerald-50 p-3">
            <Text className="text-sm font-medium text-emerald-700">
              Etiqueta capturada: {etiquetaCapturada}
            </Text>
          </View>
        ) : null}

        <TextInput
          ref={scannerInputRef}
          className="absolute h-px w-px opacity-0"
          showSoftInputOnFocus={false}
          caretHidden
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
          onSubmitEditing={handleLeituraConcluida}
        />
      </View>
    </View>
  );
}
