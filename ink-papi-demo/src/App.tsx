import { useContext, useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import { InkClientContext, WalletContext } from "./contexts/types";
import { Input } from "@headlessui/react";
import { Binary } from "polkadot-api";
import { convertSS58toHex } from "./utils/helpers";

function App() {
  const {
    fetchTokenInfo,
    fetchTokenSupply,
    fetchAllowance,
    approve,
    transferToken,
  } = useContext(InkClientContext)!;
  const { selectedAccount } = useContext(WalletContext)!;
  const [pspMetadata, setPspMetadata] =
    useState<Partial<Record<"name" | "symbol" | "decimals", string>>>();
  const [totalSupply, setSupply] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [owner, setOwner] = useState("");
  const [allowance, setAllowance] = useState(0);

  const handleTransferToken = async () => {
    if (selectedAccount) {
      await transferToken(
        receiver.startsWith("0x")
          ? Binary.fromHex(receiver)
          : Binary.fromHex(convertSS58toHex(receiver)),
        BigInt(amount),
        selectedAccount
      );
    }
  };

  const handleTransferFrom = async () => {
    if (allowance >= Number(amount) && selectedAccount) {
      approve(
        Binary.fromHex(owner.startsWith("0x") ? owner : convertSS58toHex(owner)),
        Binary.fromHex(receiver.startsWith('0x') ? receiver : convertSS58toHex(receiver)),
        BigInt(amount),
        selectedAccount
      )
    }
  }

  useEffect(() => {
    async function fetchData() {
      if (selectedAccount) {
        const metadata = await fetchTokenInfo(selectedAccount);
        setPspMetadata(metadata);
        const supply = await fetchTokenSupply();
        setSupply(supply?.toString() || "");
      }
    }
    if (selectedAccount) {
      fetchData();
    }
  }, [selectedAccount, fetchTokenInfo, fetchTokenSupply]);
  
  useEffect(() => {
    // Fetch the allowance based on the owner and connected wallet
    if (owner && selectedAccount) {
      fetchAllowance(
        owner.startsWith("0x")
          ? Binary.fromHex(owner)
          : Binary.fromHex(convertSS58toHex(owner)),
        Binary.fromHex(convertSS58toHex(selectedAccount.address)),
        selectedAccount
      ).then((response) => {
        setAllowance(Number(response))
      });
    }
  }, [owner, fetchAllowance, receiver, amount, selectedAccount]);
  const metadataSummary = useMemo(() => {
    return [
      {
        key: "name",
        title: "Token Name",
        value: pspMetadata?.name || "N/A",
      },
      {
        key: "symbol",
        title: "Token Symbol",
        value: pspMetadata?.symbol || "N/A",
      },
      {
        key: "decimals",
        title: "Token Decimals",
        value: pspMetadata?.decimals || "N/A",
      },
      {
        key: "total_supply",
        title: "Total Supply",
        value: totalSupply || "N/A",
      },
    ];
  }, [pspMetadata, totalSupply]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Token Information Section */}
      <section>
        <div className="card min-w-fit max-w-lg mx-auto mt-6 w-100 bg-base-100 card-xl shadow-sm">
          <div className="card-body">
            <h2 className="card-title">Token Metadata</h2>

            <div>
              <ul className="grid grid-cols-4 gap-5 items-center justify-between mt-6">
                {metadataSummary.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-col gap-2 font-medium"
                  >
                    <strong>{item.title}</strong>
                    <span className="text-gray-300 text-lg font-semibold">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-stretch justify-between px-10">
        <form className="px-10 py-8 mt-10 bg-blue-300/15 w-full max-w-[500px] rounded-xl">
          <div className="fieldset">
            <legend className="fieldset-legend text-xl mb-2">
              Transfer Form
            </legend>

            <label htmlFor="receiver" className="label text-lg mt-4">
              Receiver's Address
            </label>
            <Input
              className="input input-accent w-full"
              name="receiver"
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            />

            <label htmlFor="amount" className="label mt-4 text-lg">
              Transfer Amount
            </label>
            <Input
              className="input input-accent w-full"
              name="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <button
              disabled={!receiver || !amount}
              onClick={handleTransferToken}
              type="button"
              className="btn btn-secondary w-full btn-lg"
            >
              Transfer
            </button>
          </div>
        </form>

        <form className="px-10 py-8 mt-10 bg-blue-300/15 w-full max-w-[500px] rounded-xl">
          <div className="fieldset">
            <legend className="fieldset-legend text-xl mb-2">
              Transfer Form
            </legend>

            <label htmlFor="owner" className="label text-lg mt-4">
              Owner's Address
            </label>
            <Input
              className="input input-accent w-full"
              name="owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />

            <label htmlFor="receiver" className="label text-lg mt-4">
              Receiver's Address
            </label>
            <Input
              className="input input-accent w-full"
              name="receiver"
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            />

            <label htmlFor="amount" className="label mt-4 text-lg">
              Transfer Amount
            </label>
            <Input
              className="input input-accent w-full"
              name="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <button
              disabled={!receiver || !owner || !amount}
              onClick={handleTransferFrom}
              type="button"
              className="btn btn-secondary w-full btn-lg"
            >
              Transfer From
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
