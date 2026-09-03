# Aplicativo de Apontamento - Semalo Indústria E Comércio De Alimentos

Desenvolvido por: [linkedin.com/in/rauloficial](https://www.linkedin.com/in/rauloficial/)

Aplicativo mobile (Expo / React Native) para apontamento de produção em coletores de fábrica. O operador bipa a etiqueta do pallet e dos produtos, e o app registra o apontamento integrado ao ERP.

## Funcionalidades

- **Login** com sessão persistida no dispositivo (`expo-secure-store`).
- **Home**: lista as ordens de produção (OP) do operador, com busca por OP, produto ou código, e prioriza OPs já iniciadas.
- **Bipagem**: captura a etiqueta do pallet via leitor de código de barras (input dedicado, sem teclado na tela).
- **Apontamento**: registra os fardos lidos, cria e confirma o apontamento no ERP, com fluxo de retomada caso o app seja encerrado no meio de uma sincronização.
- **Modo offline**: fardos bipados sem conexão ficam pendentes e são sincronizados automaticamente quando a rede volta; um banner indica quando o dispositivo está sem internet.
- **Recuperação de falhas**: apontamentos iniciados mas não concluídos (por queda de conexão ou fechamento do app) são retomados a partir do que já foi gravado no ERP, evitando duplicidade.

## Tecnologias

- [Expo](https://docs.expo.dev/versions/v54.0.0/) 54 / React Native 0.81
- React 19 + TypeScript
- React Navigation (native stack)
- NativeWind (Tailwind CSS para React Native)
- Axios para comunicação com a API
- `expo-secure-store` para armazenamento seguro de sessão
- `@react-native-async-storage/async-storage` para dados locais (pendências, fardos apontados)
- `@react-native-community/netinfo` para detecção de conectividade

## Pré-requisitos

- Node.js LTS e npm
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (via `npx`)
- Para build/execução nativa: Android Studio (Android) e/ou Xcode (iOS)
- Uma instância da API de apontamento acessível pela rede do coletor

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente e configure a URL da API:

   ```bash
   cp .env.example .env
   ```

   ```env
   EXPO_PUBLIC_API_URL=http://SEU_IP_OU_HOST:PORTA/apontamento
   ```

   > A variável é obrigatória: o app não sobe sem ela, para evitar que um build de produção aponte para uma máquina de desenvolvimento por engano.

## Executando

```bash
npm start        # inicia o Metro / Expo Dev Tools
npm run android  # builda e executa no Android (dispositivo/emulador conectado)
npm run ios       # builda e executa no iOS (macOS + Xcode)
npm run web       # executa a versão web (uso limitado, pensado para coletores)
```

## Estrutura do projeto

```
App.tsx                  # navegação raiz e verificação de sessão
src/
  components/             # componentes de UI reutilizáveis (Button, Input, Alerta, etc.)
  navigation/              # tipos de rotas e telas
  pages/                  # telas: Login, Home, Bipagem, Apontamento
  services/                # integração com API, autenticação e persistência local
  utils/                    # utilitários (ex.: decodificação de etiqueta)
```

## Observações

- O app não deve usar valores padrão para `EXPO_PUBLIC_API_URL` — configure sempre o `.env` antes de iniciar ou gerar um build.
- Este é um aplicativo interno da Semalo, com regras de negócio específicas do processo de produção e integração com o ERP.
