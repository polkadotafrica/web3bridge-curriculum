import { useContext, useState } from "react";
import { WalletContext } from "../contexts/types";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { truncateText } from "../utils/helpers";
import classNames from "classnames";
import { FiChevronDown } from "react-icons/fi";

export default function Navbar() {
  const {
    connect,
    wallets,
    accounts,
    isConnecting,
    selectedAccount,
    activeWallet,
    switchAccount,
    disconnect
  } = useContext(WalletContext)!;
  const [openModal, setOpenModal] = useState(false);

  console.log({ accounts, selectedAccount});

  return (
    <div className="navbar bg-base-100 border-b border-purple-200">
      <div className="container mx-auto flex items-center">
        <div className="navbar-start">
          <a
            href="https://polkadot.com"
            target="_blank"
            className="flex items-center"
            rel="noopener noreferrer"
          >
            <span className="icon-[token-branded--polkadot] text-2xl" />
            <span className="text-xl font-bold font-mono tracking-wide ml-1">
              Demo Frontend D'app
            </span>
          </a>
        </div>
        <div className="navbar-end">
          {selectedAccount || activeWallet ? (
            <Menu>
              <MenuButton className="flex flex-row items-center gap-3 justify-between outline-none rounded-xl bg-purple-600 px-3">
                {selectedAccount
                  ? <span className="flex flex-col text-sm font-semibold items-start">
                    <span>{selectedAccount.name}</span>
                    <span className="text-xs text-gray-300 font-medium">{truncateText(selectedAccount.address, 4, 6)}</span>
                  </span>
                  : "Choose Account"}

                <FiChevronDown size={24} className="data-[active]:rotate-180 transition-transform" />
              </MenuButton>

              <MenuItems
                anchor="bottom end"
                className="outline-none flex flex-col gap-2 bg-slate-400/70 p-2 rounded-lg z-10"
              >
                <MenuItem>
                  <button onClick={() => setOpenModal(true)}>
                    {activeWallet ? (
                      <span>Update Wallet</span>
                    ) : (
                      <span>Change Account</span>
                    )}
                  </button>
                </MenuItem>

                <MenuItem>
                  <button onClick={disconnect}>Disconnect</button>
                </MenuItem>
              </MenuItems>
            </Menu>
          ) : (
            <button
              className="btn btn-primary btn-outline rounded-lg"
              onClick={() => setOpenModal(true)}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="min-w-lg space-y-4 border bg-gray-200 p-4 rounded-xl border-none">
            <DialogTitle className="font-bold text-2xl text-black">
              {activeWallet ? "Choose Account" : "Choose Wallet"}
            </DialogTitle>

            <div>
              {activeWallet ? (
                <div>
                  <h2 className="text-lg font-medium text-gray-700">
                    Choose Wallet
                  </h2>

                  <div className="mt-5">
                    <ul className="flex flex-col gap-2">
                      {accounts.map((act, idx) => (
                        <li
                          key={act.address}
                          className={classNames(
                            idx % 2 == 1
                              ? "bg-blue-200/30"
                              : "bg-purple-200/30",
                            "py-1 px-3 rounded-lg"
                          )}
                        >
                          <div className="flex items-center justify-start gap-4">
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-base text-black">
                                {act.name}
                              </div>
                              <div className="text-sm font-semibold text-gray-600">
                                {truncateText(act.address, 6, 7)}
                              </div>
                            </div>

                            <div className="ml-auto">
                              <button
                                disabled={
                                  selectedAccount?.address == act.address
                                }
                                onClick={() => switchAccount(act)}
                                className={classNames(
                                  selectedAccount?.address == act.address
                                    ? "btn-primary"
                                    : "btn-neutral btn-outline",
                                  "btn btn-sm rounded-lg"
                                )}
                              >
                                Switch
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-medium text-gray-700">
                    Select your preferred wallet (Only installed wallets)
                  </h2>

                  <ul className="mt-5 flex flex-col gap-4">
                    {wallets.map((wallet) => {
                      return (
                        <li key={wallet.extensionName + wallet.title}>
                          <div className="card flex flex-row items-center justify-start gap-3 p-3">
                            <div>
                              <img
                                src={wallet.logo.src}
                                alt={wallet.logo.alt}
                                className="w-10 h-10 rounded-lg"
                              />
                            </div>

                            <div className="capitalize flex flex-col gap-1 text-black font-semibold">
                              <span>{wallet.title.split(".").join(" ")}</span>
                              <span className="text-sm font-medium text-gray-800 italic">
                                {wallet.extensionName}
                              </span>
                            </div>

                            <div className="ml-auto">
                              <button
                                disabled={
                                  isConnecting ==
                                  wallet.extensionName + wallet.title
                                }
                                onClick={() => connect(wallet)}
                                className="btn btn-sm btn-secondary btn-outline rounded-lg"
                              >
                                {isConnecting ==
                                wallet.extensionName + wallet.title ? (
                                  <div className="loading loading-dots" />
                                ) : (
                                  "Connect"
                                )}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
