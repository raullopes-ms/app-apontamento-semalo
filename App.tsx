import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import "./src/styles/global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Login } from "./src/pages/Login";
import { Home } from "./src/pages/Home";
import { Bipagem } from "./src/pages/Bipagem";
import { Apontamento } from "./src/pages/Apontamento";
import { AppStackParamList, AuthStackParamList } from "./src/navigation/types";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { logout } from "./src/services/auth";
import { getAuthSession } from "./src/services/storage";
import { onUnauthorized } from "./src/services/authEvents";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { AlertaProvider } from "./src/components/AlertaProvider";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getAuthSession()
      .then((session) => setLoggedIn(!!session))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => onUnauthorized(() => setLoggedIn(false)), []);

  async function handleLogout() {
    await logout();
    setLoggedIn(false);
  }

  if (checkingSession) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <AlertaProvider>
          <NavigationContainer>
            {!loggedIn ? (
              <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                <AuthStack.Screen name="Login">
                  {() => <Login onLoginSuccess={() => setLoggedIn(true)} />}
                </AuthStack.Screen>
              </AuthStack.Navigator>
            ) : (
              <AppStack.Navigator screenOptions={{ headerShown: false }}>
                <AppStack.Screen name="Home">
                  {(props) => <Home {...props} onLogout={handleLogout} />}
                </AppStack.Screen>
                <AppStack.Screen name="Bipagem" component={Bipagem} />
                <AppStack.Screen name="Apontamento" component={Apontamento} />
              </AppStack.Navigator>
            )}
          </NavigationContainer>
        </AlertaProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
