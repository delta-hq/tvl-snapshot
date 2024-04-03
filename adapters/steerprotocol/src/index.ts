import { CHAINS, PROTOCOLS } from "./sdk/config";
import { VaultPositions, getDepositorsForAddressByVaultAtBlock, getVaultPositions } from "./sdk/subgraphDetails";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { write } from 'fast-csv';
import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { getLpTokenPrice } from "./sdk/price";
import BigNumber from "bignumber.js";



interface CSVRow {
  user: string;
  vaultId: string;
  block: number;
  lpvalue: string;
  poolId: string,
  positions: number,
  lpvalueusd: number
}


const pipeline = promisify(stream.pipeline);


const getData = async () => {
  const snapshotBlocks = [
    5911608, 5913408, 5915208, 5917008, 5918808, 5919412, 5920608, 5920714, 5920719
  ]; //await readBlocksFromCSV('src/sdk/mode_chain_daily_blocks.csv');
  
  let csvRows: CSVRow[] = [];

  for (let block of snapshotBlocks) {
    const depositors = await getDepositorsForAddressByVaultAtBlock(
      block, "", "", CHAINS.MODE, PROTOCOLS.STEER
    );

    console.log(`Block: ${block}`);
    console.log("Depositors: ", depositors.length);


    const depositorsRow: CSVRow[] = depositors.map((depositor) => {
      return {
        user: depositor.account,
        vaultId: depositor.vault.id,
        poolId: depositor.vault.pool,
        block: Number(depositor.blockNumber),
        lpvalue: depositor.shares.toString()
      } as CSVRow
    });

    csvRows = csvRows.concat(depositorsRow);
  }   

  const vaultsPositions: {
    [key: string]: VaultPositions[]
  } = {};

  const lpTokenPrices: {
    [key: string]: number
  } = {};

  for (const csvRow of csvRows) {
    let vaultPositions = [];
    let lpPriceUsd = 0;

    if (vaultsPositions[csvRow.vaultId]) {
      vaultPositions = vaultsPositions[csvRow.vaultId];
    } else {
      vaultPositions = await getVaultPositions( CHAINS.MODE, PROTOCOLS.STEER, csvRow.vaultId)
      vaultsPositions[csvRow.vaultId] = vaultPositions;
    } 

    if (lpTokenPrices[csvRow.vaultId]) {
      lpPriceUsd = lpTokenPrices[csvRow.vaultId];
    } else {
      lpPriceUsd = await getLpTokenPrice(
        CHAINS.MODE,
        csvRow.vaultId
      )
      lpTokenPrices[csvRow.vaultId] = lpPriceUsd;
    }

    const lpTokenEth = new BigNumber(csvRow.lpvalue).div(10**18);  
    
    csvRow.lpvalueusd = lpPriceUsd * lpTokenEth.toNumber();
   
    csvRow.positions = vaultPositions.length > 0 ? vaultPositions[0].lowerTick.length: 0;
  }

  // Write the CSV output to a file
  const ws = fs.createWriteStream('outputData.csv');
  write(csvRows, { headers: true }).pipe(ws).on('finish', () => {
    console.log("CSV file has been written.");
  });
};

getData().then(() => {
  console.log("Done");
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap

