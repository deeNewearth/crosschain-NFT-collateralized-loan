import { useEffect, useState, useMemo } from "react";
import { useQueryParams, IAsyncResult, ShowError } from '../utils';

import { Spinner } from "react-bootstrap";
import { ChainInfo, Injectedweb3, ConnectCtx } from './injected';
import constate from 'constate';

//the default chain needs to be the first One
const supportedChains: ChainInfo[] = [
    { chainId: '56', name: 'Binance Smart Chain', hexChainId: '0x38', rpcProvider: 'https://bsc-dataseed.binance.org/' },
    { chainId: '97', name: 'bsc Testnet', hexChainId: '0x61', rpcProvider: 'https://data-seed-prebsc-1-s1.binance.org:8545/' }
];

export const [Web3Provider,
    useweb3Context, useConnectCalls] = constate(
        useWeb3,
        v => v.ctx,
        v => v.connector
    );

function useWeb3() {
    const [ctx, setCtx] = useState<ConnectCtx & { chainInfo: ChainInfo, reconnecting?:boolean }>();

    const connect = async (chainInfo: ChainInfo) => {
        const injected = new Injectedweb3();
        const r = await injected.connect(chainInfo);
        setCtx({ ...r, chainInfo });
        return r;
    }

    const disconnect = async () => {
        if (!ctx?.chainInfo)
            return;

        try{
            setCtx({...ctx,reconnecting:true});

            const injected = new Injectedweb3();
            await injected.disconnect();
            const r = await injected.connect(ctx?.chainInfo);
            setCtx({ ...r, chainInfo: ctx?.chainInfo });
   
        }catch(error:any){
            setCtx({...ctx,reconnecting:false});
            console.error(`failed to reconnect ${error}`);
        }

    }

    const connector = useMemo(() => ({
        connect,
        disconnect
    }), [ctx]);

    return { ctx, connector };
}


export function ConnectWallet() {

    const qParams = useQueryParams();
    const { connect } = useConnectCalls();
    const liftedCtx = useweb3Context();


    const [web3ctx, setWeb3Ctx] = useState<IAsyncResult<{
        ctx?: ConnectCtx;
    }>>({ isLoading: true });

    useEffect(() => {
        console.log('connecting wallet');

        if(liftedCtx?.reconnecting){
            console.log('wallet is reconnecting exit');
            return;
        }

        let injected: any = undefined;

        if (typeof window !== "undefined") {
            injected = (window as any)?.ethereum;
        }

        if (!injected) {
            console.log("no injected provider found");
            setWeb3Ctx({ result: {} });
            return;
        }

        const usingTestnet = qParams['network'] == 'test';
        console.log(`usingTestnet = ${usingTestnet}`);

        const chainInfo = supportedChains[usingTestnet ? 1 : 0];

        (async () => {
            try {
                const ctx = await connect(chainInfo);
                setWeb3Ctx({ result: { ctx } });

            } catch (error: any) {
                setWeb3Ctx({ error });
            }

        })();

    }, []);

    if (!!web3ctx.isLoading || liftedCtx?.reconnecting) {
        return <div className="p-3 d-flex ">
            <Spinner animation="border" variant="primary" />
            <span className="m-1">Waiting for wallet</span>
        </div>;
    }

    if (!!web3ctx?.error) {
        return <ShowError error={web3ctx?.error} />
    }

    if (web3ctx.result && !web3ctx.result.ctx) {
        return <div className="text-center">
            <h2>No injected wallet found</h2>
            <p>We suggest installing <a href="https://metamask.io/download">Metamask</a></p>
        </div>;
    }

    return <div>ok </div>;



    /*
    return (
        <div>
          {`The current page is: ${qParams['network']||'unknown'}`}
          
        </div>
    );
    */
}
