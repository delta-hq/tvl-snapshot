export const enum CHAINS{
    MODE = 34443,
}
export const enum PROTOCOLS{
    OVN = 1
}

export const enum AMM_TYPES{
    UNISWAPV3 = 0,
}

export const enum OVNPOOLS{
    FIRST = 0,
    SECOND = 1,
}

export const SUBGRAPH_URLS = {
    [CHAINS.MODE]: {
        [PROTOCOLS.OVN]: {
            [OVNPOOLS.FIRST]: {
                url:  "https://api.studio.thegraph.com/query/68020/linea_ovn/version/latest",
                pool: "0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91"
            },
            [OVNPOOLS.SECOND]: {
                url:  "https://api.studio.thegraph.com/query/68020/ovn_linea_2/version/latest",
                pool: "0x58aacbccaec30938cb2bb11653cad726e5c4194a"
            } 
        }
    }
}
export const RPC_URLS = {
    [CHAINS.MODE]: "https://rpc.goldsky.com"
}