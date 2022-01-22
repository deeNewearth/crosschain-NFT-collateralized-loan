import { useState } from 'react';
import { Button, Spinner, Container } from 'react-bootstrap';
import { useConnectCalls } from '../web3';
import { IAsyncResult,ShowError } from '../utils';

import { AssetFaucet } from '../../typechain/AssetFaucet';
import AssetFaucet_JSON from '../../typechain/AssetFaucet.json';

export default function FaucetView(){
    const {connect, contractDetails} = useConnectCalls();
    const [sumbitted,setSubmitted] = useState<IAsyncResult<string>>();

    return <Container className='text-center'>

        <p>Faucet NFT address : {contractDetails.assetSide.testFaucet}</p>

        <Button size='lg' disabled={!!sumbitted?.isLoading} onClick={async ()=>{
            try{
                setSubmitted({isLoading:true});
                const {web3,account} = await connect(contractDetails.assetSide.chain);

                const assetFaucet: AssetFaucet = new web3.eth.Contract(AssetFaucet_JSON.abi as any, contractDetails.assetSide.testFaucet) as any;

                let myBalance = Number.parseInt( await assetFaucet.methods.balanceOf(account).call());

                if(0 != myBalance){
                    const newTokenId = await assetFaucet.methods.tokenOfOwnerByIndex(account, (myBalance-1) ).call();
                    throw new Error(`the wallet ${account} already owns TokenId ${newTokenId}`);    
                }


                const rcpt = await assetFaucet.methods.giveMe().send({
                    from:account
                });

                myBalance = Number.parseInt( await assetFaucet.methods.balanceOf(account).call());

                if(!myBalance){
                    throw new Error(`mint succeeded with tx ${rcpt.transactionHash} But we failed to get new Token Id. Please try again`);
                }

                const newTokenId = await assetFaucet.methods.tokenOfOwnerByIndex(account, (myBalance-1) ).call();

                const result = `tokenId ${newTokenId} minted by wallet ${account} `;

                setSubmitted({result});


            }catch(error:any){
                setSubmitted({error});
            }
        }}>
            Give me a  Test NFT
        </Button>

        {!!sumbitted?.isLoading && <div><Spinner animation="border" variant="primary"/>
            <span className='text-primary'>{sumbitted?.loadingPrompt || 'Waiting for wallet'}</span>
        </div>
        }

        {!!sumbitted?.error && <ShowError error={sumbitted?.error}/>}

        {!!sumbitted?.result && <h4 className='text-info'>{sumbitted?.result}</h4>}

    </Container>;
}