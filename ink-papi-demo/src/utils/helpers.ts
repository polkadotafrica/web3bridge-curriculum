import { decodeAddress, keccak256AsU8a } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { connectInjectedExtension } from "@polkadot-api/pjs-signer";
import type { WalletAccount } from "@talismn/connect-wallets";

export function truncateText(text: string, start: number, end: number): string {
  if (!text || text.length < 1) return "";
  if (start < 0 || start >= text.length || end >= text.length) {
    throw new Error("Invalid start or end values");
  }
  return `${text.slice(0, start)}...${text.slice(text.length - end)}`;
}

export function decodeU128(words: bigint[] | bigint): bigint {
  if (typeof words === "bigint") return words; // already normalized
  if (!Array.isArray(words)) throw new Error("Unexpected type");

  return words[0] + (words[1] << 64n) + (words[2] << 128n) + (words[3] << 192n);
}

export function convertSS58toHex(address: string): string {
  const pubKey = decodeAddress(address);

  const pubKeyDigest = keccak256AsU8a(pubKey);
  const hexAddress = pubKeyDigest.slice(-20);

  console.log({ hexAddress, textHexAddress: u8aToHex(hexAddress) });
  return u8aToHex(hexAddress);
}

export async function getPolkadotSigner(account: WalletAccount) {
  const signers = await connectInjectedExtension(
    account.wallet?.extensionName || "polkadot-js"
  );
  console.log({ signers });
  const signer = signers
    .getAccounts()
    .find(({ address }) => address == account.address);
  return signer?.polkadotSigner;
}
