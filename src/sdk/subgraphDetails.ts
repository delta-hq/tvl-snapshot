import BigNumber from "bignumber.js";
import { AMM_TYPES, CHAINS, OVNPOOLS, PROTOCOLS, SUBGRAPH_URLS } from "./config";
import { PositionMath } from "./utils/positionMath";
// import fetch from "node-fetch";

export interface Position{
    id: string;
    liquidity: bigint;
    owner: string;
    pool: string;
};


export interface PositionWithUSDValue extends Position{
    token0USDValue: string;
    token1USDValue: string;
    token0AmountsInWei: bigint;
    token1AmountsInWei: bigint;
    token0DecimalValue: number;
    token1DecimalValue: number;
}
    
// OVN pools
// 0x58aacbccaec30938cb2bb11653cad726e5c4194a usdc/usd+
// 0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91 usdt+/usd+

export const getPositionsForAddressByPoolAtBlock = async (
    blockNumber: number,
    address: string,
    poolId: string,
    chainId: CHAINS,
    protocol: PROTOCOLS,
): Promise<Position[]> => {
    let whereQuery = blockNumber ? `where: { blockNumber_lt: ${blockNumber} }` : "";

    let skip = 0;
    let fetchNext = true;

    const allPoolsRes = await Promise.all(Object.values(SUBGRAPH_URLS[chainId][protocol]).map(async (_) => {
        const url = _.url
        const poolId = _.pool
        let result: Position[] = [];

        while(fetchNext){
            let query = `{
                deposits(${whereQuery} orderBy: amount, first: 1000,skip: ${skip}) {
                    id
                    amount
                    user
                    blockNumber
                }
            }`;

            let response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({ query }),
                headers: { "Content-Type": "application/json" },
            });
            let data = await response.json();

            let positions = data.data.deposits;
            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];
                let transformedPosition: Position = {
                    id: position.id,
                    liquidity: BigInt(position.amount),
                    owner: position.user,
                    pool: poolId,
                };
                result.push(transformedPosition);
                
            }
            if(positions.length < 1000){
                fetchNext = false;
            }else{
                skip += 1000;
            }
        }

        return result
    }))

    return allPoolsRes.flat(1);
}


export const getPositionAtBlock = async (
    blockNumber: number,
    positionId: number,
    chainId: CHAINS,
    protocol: PROTOCOLS,
    ammType: AMM_TYPES
): Promise<Position> => {
    let ovnPoolId = SUBGRAPH_URLS[chainId][protocol][ammType].pool;
    let subgraphUrl = SUBGRAPH_URLS[chainId][protocol][ammType].url;
    let blockQuery = blockNumber !== 0 ? `, block: {number: ${blockNumber}}` : ``;
    let query = `{
        position(id: "${positionId}" ${blockQuery}) {
            id
            pool {
                sqrtPrice
                tick
            }
            tickLower{
                tickIdx
            }
            tickUpper{
                tickIdx
            }
            liquidity
            token0 {
                id
                decimals
                derivedUSD
                name
                symbol
            }
            token1 {
                id
                decimals
                derivedUSD
                name
                symbol
            }
        },
        _meta{
                block{
                number
            }
        }
    }`;

    let response = await fetch(subgraphUrl, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
    });
    let data = await response.json();
    let position = data.data.position;


    return  {
        id: position.id,
        liquidity: BigInt(position.liquidity),
        owner: position.owner,
        pool: ovnPoolId,
    };

    // let tickLow = Number(position.tickLower.tickIdx);
    // let tickHigh = Number(position.tickUpper.tickIdx);
    // let liquidity = BigInt(position.liquidity);
    // let sqrtPriceX96 = BigInt(position.pool.sqrtPrice);
    // let tick = Number(position.pool.tick);
    // let decimal0 = position.token0.decimals;
    // let decimal1 = position.token1.decimals;
    // let token0DerivedUSD = position.token0.derivedUSD;
    // let token1DerivedUSD = position.token1.derivedUSD;
    // let token0AmountsInWei = PositionMath.getToken0Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);
    // let token1AmountsInWei = PositionMath.getToken1Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);
    

    // let token0DecimalValue = Number(token0AmountsInWei) / 10 ** decimal0;
    // let token1DecimalValue = Number(token1AmountsInWei) / 10 ** decimal1;
    
    // let token0UsdValue = BigNumber(token0AmountsInWei.toString()).multipliedBy(token0DerivedUSD).div(10 ** decimal0).toFixed(4);
    // let token1UsdValue = BigNumber(token1AmountsInWei.toString()).multipliedBy(token1DerivedUSD).div(10 ** decimal1).toFixed(4);


    // return [position.token0, position.token1,token0AmountsInWei, token1AmountsInWei, token0DecimalValue, token1DecimalValue,token0UsdValue, token1UsdValue,data.data._meta];
}

export const getPositionDetailsFromPosition =  (
    position: Position
):Position => {
    let liquidity = position.liquidity;


    return {...position};

}

export const getLPValueByUserAndPoolFromPositions = (
    positions: Position[]
): Map<string, Map<string, BigNumber>> => {
    let result = new Map<string, Map<string, BigNumber>>();
    for (let i = 0; i < positions.length; i++) {
        let position = positions[i];
        let poolId = position.id;
        let owner = position.owner;
        let userPositions = result.get(owner);
        if (userPositions === undefined) {
            userPositions = new Map<string, BigNumber>();
            result.set(owner, userPositions);
        }
        let poolPositions = userPositions.get(poolId);
        if (poolPositions === undefined) {
            poolPositions = BigNumber(0);
        }
        let positionWithUSDValue = getPositionDetailsFromPosition(position);
        poolPositions = poolPositions.plus(position.liquidity.toString());
        userPositions.set(poolId, poolPositions);
    }
    return result;
}
