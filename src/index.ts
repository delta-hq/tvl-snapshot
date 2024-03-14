import {Web3} from "web3";
import {AMM_TYPES, CHAINS, PROTOCOLS, RPC_URLS} from "./sdk/config";
import {
  getLPValueByUserAndPoolFromPositions,
  getPositionDetailsFromPosition,
  getPositionsForAddressByPoolAtBlock
} from "./sdk/subgraphDetails";
import {promisify} from 'util';
import stream from 'stream';
import csv from 'csv-parser';
import fs from 'fs';
import {write} from 'fast-csv';

import BORROWER_OPERATION_ABI from "./abi/BorrowerOperations.json";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const LINEA_MAINNET_RPC_URL = "https://1rpc.io/linea";
const LINEA_MAINNET_BORROWER_OPERATIONS = "0xA2569C5660F878968307fe677886a533599c0DF3"
const TOPIC_CREATE_TROVE = "0x59cfd0cd754bc5748b6770e94a4ffa5f678d885cb899dcfadc5734edb97c67ab"
const TOPIC_UPDATE_TROVE  = "0xc3770d654ed33aeea6bf11ac8ef05d02a6a04ed4686dd2f624d853bbec43cc8b"

interface PastLog {
  topics: string[];
  transactionHash: string;
}

interface LPValueDetails {
  pool: string;
  lpValue: string;
}

interface UserLPData {
  totalLP: string;
  pools: LPValueDetails[];
}

// Define an object type that can be indexed with string keys, where each key points to a UserLPData object
interface OutputData {
  [key: string]: UserLPData;
}

interface CSVRow {
  user: string;
  hash: string;
  block: number;
  depositEth: string;
}


const pipeline = promisify(stream.pipeline);

// Assuming you have the following functions and constants already defined
// getPositionsForAddressByPoolAtBlock, CHAINS, PROTOCOLS, AMM_TYPES, getPositionDetailsFromPosition, getLPValueByUserAndPoolFromPositions, BigNumber

const readBlocksFromCSV = async (filePath: string): Promise<number[]> => {
  const blocks: number[] = [];
  await pipeline(
    fs.createReadStream(filePath),
    csv(),
    async function* (source) {
      for await (const chunk of source) {
        // Assuming each row in the CSV has a column 'block' with the block number
        if (chunk.block) blocks.push(parseInt(chunk.block, 10));
      }
    }
  );
  return blocks;
};


const getData = async () => {
  const web3 = new Web3(LINEA_MAINNET_RPC_URL)
  const borrowerOperation = new web3.eth.Contract(BORROWER_OPERATION_ABI.abi, LINEA_MAINNET_BORROWER_OPERATIONS)

  const snapshotBlocks = [
    976308,991849
  ]; //await readBlocksFromCSV('src/sdk/mode_chain_daily_blocks.csv');
  
  const csvRows: CSVRow[] = [];
  for (let blockNum of snapshotBlocks) {
    const pastLogs = await web3.eth.getPastLogs({
      fromBlock: blockNum,
      toBlock: blockNum,
      address: LINEA_MAINNET_BORROWER_OPERATIONS,
      topics: [[TOPIC_CREATE_TROVE, TOPIC_UPDATE_TROVE]]
    })
    const txnSet = new Set<string>();
    for (let pastLog of pastLogs) {
      const log = pastLog as PastLog
      if (txnSet.has(log.transactionHash)) {
        continue
      }
      const txn = await web3.eth.getTransaction(log.transactionHash)
      const user = txn.from
      const depositEth = web3.utils.fromWei(txn.value, 'ether')
      console.log(`Block: ${blockNum}, User: ${user}, Hash: ${log.transactionHash}, Deposit: ${depositEth}`)
      csvRows.push({
        user: user,
        hash: log.transactionHash,
        block: blockNum,
        depositEth: depositEth,
      })
      txnSet.add(log.transactionHash)
    }
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

