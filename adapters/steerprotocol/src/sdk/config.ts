export const enum CHAINS{
    MODE = 34443,
}
export const enum PROTOCOLS{
    STEER = 0,
}

export const enum AMM_TYPES{
    UNISWAPV3 = 0,
}

export const SUBGRAPH_URLS = {
    [CHAINS.MODE]: {
        [PROTOCOLS.STEER]:  "https://api.goldsky.com/api/public/project_clohj3ta78ok12nzs5m8yag0b/subgraphs/steer-protocol-mode/1.1.2/gn"
    }
}
export const RPC_URLS = {
    [CHAINS.MODE]: "https://rpc.goldsky.com"
}