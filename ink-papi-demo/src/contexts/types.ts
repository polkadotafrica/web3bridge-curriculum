import type { Wallet, WalletAccount } from "@talismn/connect-wallets";
import type { Binary, PolkadotClient } from "polkadot-api";
import { createContext } from "react";

export type WalletContextType = {
  connect: (wallet: Wallet) => Promise<void>;
  disconnect: () => void;
  wallets: Wallet[];
  isConnecting: string | false;
  activeWallet: null | Wallet;
  accounts: WalletAccount[];
  selectedAccount?: WalletAccount;
  switchAccount: (account: WalletAccount) => void;
};

export const WalletContext = createContext<WalletContextType | null>(null);

type InkClientContextType = {
  client: PolkadotClient | null;
  fetchTokenInfo: (account: WalletAccount) => Promise<{
    name?: string;
    symbol?: string;
    decimals?: string;
  }>;
  fetchTokenSupply: () => Promise<bigint | undefined>;
  deploy: (account: WalletAccount) => Promise<void>;
  transferToken: (to: Binary, amount: bigint, account: WalletAccount) => Promise<void>;
};

export const InkClientContext = createContext<InkClientContextType | null>(null);