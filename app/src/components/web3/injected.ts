import Web3 from "web3";

export type ChainInfo = {
    chainId: string;
    name: string;
    hexChainId: string;
    rpcProvider: string;
}

export type ConnectCtx ={
    web3:Web3;
    account:string;
}



export class Injectedweb3 {

    readonly injected: any = undefined;
   

    constructor() {

        if (typeof window !== "undefined") {
            this.injected = (window as any)?.ethereum;
        }

        if (!this.injected) {
            throw new Error("no injected provider found");
        }

    }

    disconnect = async ()=> {
        await this.injected.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
        });

    };

    connect = async (chainInfo: ChainInfo) => {

        await this.ensureCorrectChain(chainInfo);

        const accounts: string[] = await this.injected.request({ method: 'eth_requestAccounts' });

        console.log(`injected : provider connected :${accounts[0]}`);

        return {web3: new Web3(this.injected), account:accounts[0]} as ConnectCtx;
    };

    private ensureCorrectChain = async (chainInfo: ChainInfo) => {

        const { chainId } = chainInfo;

        try {
            console.log(`current chain id ${this.injected.networkVersion}`);

            if (this.injected.networkVersion == chainId) {
                console.log(`current chain id ${chainId} is correct`);
                return;
            }

            await this.injected.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainInfo?.hexChainId }],
            });

            console.log(`switched to chain id ${this.injected.networkVersion}`);

        } catch (switchError: any) {

            const j = switchError.code;


            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {

                    if (!chainInfo?.rpcProvider)
                        throw new Error(`no rpc defined for chainId ${chainId}`);



                    await this.injected.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: chainInfo?.hexChainId,
                            chainName: chainInfo.name,

                            rpcUrls: [chainInfo?.rpcProvider]
                        }],
                    });

                    console.log(`added and switched to chain id ${this.injected.networkVersion}`);

                    throw new Error("We added the network to your wallet. Please try your operations again");

                } catch (addError: any) {

                    console.error(`failed to add network : ${addError?.message}`);
                    throw new Error("failed to switch network. Please switch manually and try again");
                }
            }

            console.error(`failed to switch network : ${switchError}`);

            throw new Error("failed to switch network. Please switch manually and try again");
        }

    }


}