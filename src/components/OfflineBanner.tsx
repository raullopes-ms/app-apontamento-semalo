import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(
        state.isConnected === false || state.isInternetReachable === false,
      );
    });
  }, []);

  if (!offline) return null;

  return (
    <View className="items-center bg-red-600 py-1">
      <Text className="text-xs font-medium text-white">
        Sem conexão com a internet
      </Text>
    </View>
  );
}
