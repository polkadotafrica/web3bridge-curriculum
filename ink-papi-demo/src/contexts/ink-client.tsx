import { contracts, passet } from "@polkadot-api/descriptors";
import { Binary, createClient, Enum, type PolkadotClient } from "polkadot-api";
import { getInkClient } from "polkadot-api/ink";
import { getWsProvider } from "polkadot-api/ws-provider";
import { useCallback, useMemo, useState } from "react";
import { InkClientContext } from "./types";
import type { WalletAccount } from "@talismn/connect-wallets";
import {
  convertSS58toHex,
  decodeU128,
  getPolkadotSigner,
} from "../utils/helpers";
import { createInkSdk } from "@polkadot-api/sdk-ink";

type Props = {
  children: React.ReactNode;
};

export default function InkClientProvider({ children }: Props) {
  const [client, setClient] = useState<PolkadotClient | null>(null);

  // Initialize the client
  // This needs to be done first, before we can initialize our contract
  // or even call the contrat using the typedApi
  const initializeClient = useCallback(async () => {
    const client = createClient(
      getWsProvider("wss://testnet-passet-hub.polkadot.io")
    );

    setClient(client);
    return client;
  }, []);

  // Read the token metadata details using the low-level ink! API
  const fetchTokenMetadata = useCallback(
    async (account: WalletAccount) => {
      const cl = client ?? (await initializeClient());

      const inkClient = getInkClient(contracts.psp_coin);
      const typedApi = cl.getTypedApi(passet);

      const metadata: Partial<Record<"name" | "symbol" | "decimals", string>> =
        {};
      const pspNameMessage = inkClient.message("PSP22Metadata::name");
      const pspSymbolMessage = inkClient.message("PSP22Metadata::symbol");
      const pspDecimalsMessage = inkClient.message("PSP22Metadata::decimals");

      const nameResponse = await typedApi.apis.ReviveApi.call(
        account.address,
        Binary.fromHex("0xC139114BB0199171a12b39ba4a0A818eF637F840"), // contract address as Binary
        0n, // Transferred value (self.env().transferred_value()) is 0
        undefined, // Gas limit is optional,
        undefined, // Storage deposit limit is optional
        pspNameMessage.encode() // Encoded message to be sent to the contract, no args,
      );
      const symbolResponse = await typedApi.apis.ReviveApi.call(
        account.address,
        Binary.fromHex("0xC139114BB0199171a12b39ba4a0A818eF637F840"), // contract address as Binary
        0n, // Transferred value (self.env().transferred_value()) is 0
        undefined, // Gas limit is optional,
        undefined, // Storage deposit limit is optional
        pspSymbolMessage.encode() // Encoded message to be sent to the contract, no args,
      );
      const decimalResponse = await typedApi.apis.ReviveApi.call(
        account.address,
        Binary.fromHex("0xC139114BB0199171a12b39ba4a0A818eF637F840"), // contract address as Binary
        0n, // Transferred value (self.env().transferred_value()) is 0
        undefined, // Gas limit is optional,
        undefined, // Storage deposit limit is optional
        pspDecimalsMessage.encode() // Encoded message to be sent to the contract, no args,
      );
      if (nameResponse.result.success) {
        console.log({ response: nameResponse });
        const response = pspNameMessage.decode(nameResponse.result.value);
        metadata["name"] = response.value as string;
      }
      if (symbolResponse.result.success) {
        const response = pspSymbolMessage.decode(symbolResponse.result.value);
        metadata["symbol"] = response.value as string;
      }
      if (decimalResponse.result.success) {
        const response = pspDecimalsMessage.decode(
          decimalResponse.result.value
        );
        metadata["decimals"] = `${response.value}`;
      }

      return metadata;
    },
    [client, initializeClient]
  );

  const fetchTokenSupply = useCallback(async () => {
    const cl = client ?? (await initializeClient());

    const inkClient = getInkClient(contracts.psp_coin);
    const typedApi = cl.getTypedApi(passet);

    const supplyMessage = inkClient.message("PSP22::total_supply");
    const response = await typedApi.apis.ReviveApi.call(
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // any address will do, because it's a query
      Binary.fromHex("0xC139114BB0199171a12b39ba4a0A818eF637F840"), // contract address as Binary
      0n, // Transferred value (self.env().transferred_value()) is 0
      undefined, // Gas limit is optional,
      undefined, // Storage deposit limit is optional
      supplyMessage.encode() // Encoded message to be sent to the contract, no args,
    );

    if (response.result.success) {
      return decodeU128(
        supplyMessage.decode(response.result.value).value as bigint[]
      );
    }
  }, [client, initializeClient]);

  const deployNewToken = useCallback(
    async (account: WalletAccount) => {
      const pspHashResponse = await fetch(
        "../../deployments/psp/psp_coin.polkavm"
      );
      const pspBuffer = await pspHashResponse.arrayBuffer();
      const pspCodeHash = Binary.fromBytes(new Uint8Array(pspBuffer));
      console.log({ pspCodeHash });

      const cl = client ?? (await initializeClient());
      const typedApi = cl.getTypedApi(passet);
      const inkClient = getInkClient(contracts.psp_coin);

      const constructor = inkClient.constructor("new_with_supply");
      const constructorArgs = constructor.encode({
        owner: Binary.fromHex(convertSS58toHex(account.address)),
        total_supply: [15653200n, 0n, 0n, 0n],
      });

      const response = await typedApi.apis.ReviveApi.instantiate(
        account.address,
        0n, // endowment
        undefined, // gas limit (optional)
        undefined, // storage deposit limit
        Enum("Upload", pspCodeHash), // code hash
        constructorArgs, // encoded constructor args
        undefined // salt (optional)
      );

      if (response.result.success) {
        const contractAddress = response.result.value.addr;
        console.log("Deplopyed contract address:", contractAddress);

        const responseMsg = constructor.decode(response.result.value.result);
        console.log("Deployed response:", responseMsg);
      } else {
        console.error("Error deploying contract:", response);
      }
    },
    [client, initializeClient]
  );

  // Read smart contract query message using low-level ink! API
  const fetchTokenAllowance = useCallback(
    async (owner: Binary, spender: Binary, account: WalletAccount) => {
      // Implementation for fetching token allowance
      const cl = client || (await initializeClient());

      const inkClient = createInkSdk(cl);
      const pspContract = inkClient.getContract(
        contracts.psp_coin,
        "0xC139114BB0199171a12b39ba4a0A818eF637F840"
      );
      const result = await pspContract.query("PSP22::allowance", {
        origin: account.address,
        data: {
          owner: owner,
          spender: spender,
        },
      });
      if (result.success) {
        console.log({ result: result.value.response });
        return decodeU128(result.value.response as bigint[]);
      } else {
        console.log("Failed query", result);
        return 0n;
      }
    },
    [client, initializeClient]
  );

  /// Write to a smart contract message using the new SDK INK!
  const transferToken = useCallback(
    async (to: Binary, amount: bigint, account: WalletAccount) => {
      // Initialize the client again
      const cl = client ?? (await initializeClient());

      // createInkSdk comes from the new ink! SDK
      const inkClient = createInkSdk(cl);
      // Initialize the contract using the typed Metadata and address
      const pspContract = inkClient.getContract(
        contracts.psp_coin,
        "0xC139114BB0199171a12b39ba4a0A818eF637F840"
      );

      // Get the connected wallet's signer
      const signer = await getPolkadotSigner(account);
      if (signer) {
        // Next lines perform the actual send transaction
        const result = await pspContract
          .send("PSP22::transfer", {  // Send a transfer message
            origin: account.address,  // connected wallet as the origin
            data: {
              to,
              value: [amount, 0n, 0n, 0n],
              _data: Binary.fromText(""),
            },
          })
          .signAndSubmit(signer);

        if (result.ok) {
          console.log("Transfer successful:", result);
        } else {
          console.error("Transfer failed:", result);
        }
      }
    },
    [client, initializeClient]
  );

  /// This works same as the transfer function above
  /// It calls transfer from instead and approval must have been granted prior
  const approveAllowance = useCallback(async (
    owner: Binary,
    receiver: Binary,
    amount: bigint,
    account: WalletAccount
  ) => {
    const cl = client || (await initializeClient());
    const inkClient = createInkSdk(cl);
    const pspContract = inkClient.getContract(
      contracts.psp_coin,
      "0xC139114BB0199171a12b39ba4a0A818eF637F840"
    );
    const signer = await getPolkadotSigner(account);
    if (signer) {
      const result = await pspContract.send("PSP22::transfer_from", {
        origin: account.address,
        data: {
          from: owner,
          to: receiver,
          value: [amount, 0n, 0n, 0n],
          data: Binary.fromText("")
        },
      }).signAndSubmit(signer);

      if (result.ok) {
        console.log("Transfer successful:", result);
      } else {
        console.error("Transfer failed:", result);
      }
    }
  }, [client, initializeClient]);

  const ctxValue = useMemo(() => {
    return {
      client: client,
      fetchTokenInfo: fetchTokenMetadata,
      fetchTokenSupply: fetchTokenSupply,
      deploy: deployNewToken,
      transferToken,
      approve: approveAllowance,
      fetchAllowance: fetchTokenAllowance,
    };
  }, [
    client,
    fetchTokenMetadata,
    transferToken,
    fetchTokenAllowance,
    deployNewToken,
    fetchTokenSupply,
    approveAllowance,
  ]);

  return (
    <InkClientContext.Provider value={ctxValue}>
      {children}
    </InkClientContext.Provider>
  );
}
