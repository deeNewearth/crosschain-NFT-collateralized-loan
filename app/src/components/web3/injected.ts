import Web3 from "web3";

//NOT sure whe there need to be require and cannot be imported
const ethUtil = require('ethereumjs-util');
const sigUtil = require('eth-sig-util')


export type ChainInfo = {
    chainId: string;
    name: string;
    hexChainId: string;
    rpcProvider: string;
}


export class ConnectCtx{
    readonly web3:Web3;
    readonly account:string;

    constructor(web3:Web3, account:string){
        this.web3 = web3;
        this.account = account;
    }

    dataDecrypter = async (encryptedMessage: string) => {
        try {

            const provider: any = this.web3.currentProvider;    

            const dectpted: string = await provider.request({
                method: "eth_decrypt",
                params: [encryptedMessage, this.account]
            });

            return dectpted;

        } catch (err: any) {
            throw new Error(`You provide doesn't support encryption. please try metamask: ${err}`);
        }
    }

    dataEncrypt = async (plainText:string) => {
        try {
            
            const provider: any = this.web3.currentProvider;
            
            const encryptionPublicKey = await provider.request({
                method: "eth_getEncryptionPublicKey",
                params: [this.account]
            });
    
            
            const k = sigUtil.encrypt(
                encryptionPublicKey,
                { data: plainText },
                'x25519-xsalsa20-poly1305'
            );
    
    
            const encryptedMessage: string = ethUtil.bufferToHex(
                Buffer.from(
                    JSON.stringify(k),
                    'utf8'
                )
            );
    
            return encryptedMessage;
    
        } catch (err: any) {
            
            throw new Error(`Your provider doesn't support encryption. please try metamask: ${err}`);
        }
    }

    evmPackedSecret = (secret:string) =>{
        return this.web3.utils.sha3(secret)||'';
    }

    evmSecrethash =(secret: string) =>{
        
        const preImage = this.evmPackedSecret(secret);
        const encoded = this.web3.eth.abi.encodeParameters(['bytes32'], [preImage]);
        return this.web3.utils.keccak256(encoded)
    
    }
    
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

        return new ConnectCtx(new Web3(this.injected), accounts[0]);
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