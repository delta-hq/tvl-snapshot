import { CHAINS } from "./config";

export async function getLpTokenPrice(chainId: CHAINS, vaultId: string): Promise<number> {

  let response = await fetch(`https://api.steer.finance/pool/lp/value?chain=${chainId}&address=${vaultId}`);
  let data:any = await response.json();

  // Access data property directly from response
  const pricePerLP = (data?.pricePerLP || 0);

  return pricePerLP;
}