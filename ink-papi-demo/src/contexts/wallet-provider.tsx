import {
  getWallets,
  type Wallet,
  type WalletAccount,
} from "@talismn/connect-wallets";
import { useCallback, useEffect, useMemo, useState } from "react";
import { name } from "../../package.json";
import { WalletContext } from "./types";

const STORED_WALLET_KEY = "dapp:wallet";
const DAPP_NAME = name;

type Props = {
  children: React.ReactNode;
};

export default function WalletProvider({ children }: Props) {
  const [activeWallet, setActiveWallet] = useState<Wallet | null>(null);
  const [selectedAccount, setAccount] = useState<WalletAccount>();
  const [isConnecting, setConnecting] = useState<string | false>(false);
  const [accounts, setAccountsList] = useState<WalletAccount[]>([]);

  const availableWallets = useMemo(() => {
    const wallets = getWallets();
    console.log({ wallets });

    return wallets;
  }, []);

  console.log({ availableWallets});

  const connectWallet = useCallback(async (wallet: Wallet) => {
    try {
      setConnecting(wallet.extensionName + wallet.title);
      setAccountsList([]);

      // store selected wallet to ls
      localStorage.setItem(STORED_WALLET_KEY, JSON.stringify(wallet));

      await wallet.enable(DAPP_NAME);
      const accounts = await wallet.getAccounts();

      if (accounts) {
        setAccountsList(accounts);
        setAccount(accounts[0]);
      }
      setActiveWallet(wallet);
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      setAccount(undefined);
      localStorage.removeItem(STORED_WALLET_KEY);
      // setErrors(error)
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (activeWallet) {
      setActiveWallet(null);
      setAccountsList([]);
      setAccount(undefined);
      localStorage.removeItem(STORED_WALLET_KEY);
    }
  }, [activeWallet]);

  const switchSelectedAccount = useCallback((account: WalletAccount) => {
    setAccount(account);
  }, []);

  const ctxValue = useMemo(() => {
    return {
      connect: connectWallet,
      disconnect: disconnectWallet,
      wallets: availableWallets,
      selectedAccount,
      activeWallet,
      accounts,
      isConnecting,
      switchAccount: switchSelectedAccount,
    };
  }, [
    connectWallet,
    availableWallets,
    activeWallet,
    disconnectWallet,
    switchSelectedAccount,
    selectedAccount,
    accounts,
    isConnecting,
  ]);

  useEffect(() => {
    const storedWallet = localStorage.getItem(STORED_WALLET_KEY);
    if (storedWallet && !activeWallet) {
      const walletData = JSON.parse(storedWallet) as Wallet;
      const wallet = availableWallets.find(
        (w) => w.extensionName === walletData.extensionName
      );
      if (wallet) {
        connectWallet(wallet);
      } else {
        localStorage.removeItem(STORED_WALLET_KEY);
      }
    }
  }, [availableWallets, activeWallet, connectWallet]);

  return (
    <WalletContext.Provider value={ctxValue}>{children}</WalletContext.Provider>
  );
}
