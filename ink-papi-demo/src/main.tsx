import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import InkClientProvider from "./contexts/ink-client.tsx";
import WalletProvider from "./contexts/wallet-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <InkClientProvider>
        <App />
      </InkClientProvider>
    </WalletProvider>
  </StrictMode>
);
