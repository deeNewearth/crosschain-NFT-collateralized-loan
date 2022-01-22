import { useState } from 'react';
import { Button, Spinner, Container, InputGroup, FormControl, Form, Row, Col } from 'react-bootstrap';
import { useConnectCalls } from '../web3';
import { IAsyncResult, ShowError } from '../utils';

import { AssetSide } from '../../typechain/AssetSide';
import AssetSide_JSON from '../../typechain/AssetSide.json';

import { AssetFaucet } from '../../typechain/AssetFaucet';
import AssetFaucet_JSON from '../../typechain/AssetFaucet.json';


import './borrow.scss';

export function LoanRequestView() {
    const { connect, contractDetails } = useConnectCalls();
    const [sumbitted, setSubmitted] = useState<IAsyncResult<string>>();

    const [loan,setLoan] = useState<{
        asset?:string;
        tokenId?:number;
    }>({});

    const [checkNFT,setCheckNFT] = useState<IAsyncResult<string>>();

    return <Container className="chooseNFT"><Form noValidate >

        <Form.Label>NFT collateral</Form.Label>

        <Form.Group className="d-flex flex-sm-row flex-column align-items-center gap-2">

            <InputGroup className="my-3 token" hasValidation>
               
                <Form.Control required  placeholder="ERC721 address only" className="contractAddress flex-grow-1" 
                    value={loan?.asset||''} 
                    isValid={checkNFT?.result?true:undefined} 
                    isInvalid={checkNFT?.error?true:undefined}
                    onChange={e=>setLoan({...loan,asset:e.target.value})}
                />
                
                <Form.Control required placeholder="tokenId" className="tokenId" 
                    value={loan.tokenId?.toString()||''}
                    isInvalid={!!checkNFT && ! (loan.tokenId?.toString()||'')}
                    isValid={checkNFT?.result?true:undefined} 
                    onChange={e=>{
                        if(!e.target.value){
                            setLoan({...loan,tokenId:undefined});
                            return;
                        }else{
                            const tokenId = Number.parseInt(e.target.value);
                            if(!isNaN(tokenId)){
                                setLoan({...loan,tokenId});
                            }

                        }
                    }}
                />
                
            </InputGroup>

            <Button variant="success" id="button-checknft" className="verifyBtn" 
                    disabled={!!checkNFT?.isLoading} onClick={async ()=>{
                        try{
                            setCheckNFT({isLoading:true});

                            if(!loan.asset)
                                throw new Error('ERC721 address is required');

                            if(undefined == loan.tokenId){
                                throw Error('TokenId is required');
                            }

                            const {web3,account} = await connect(contractDetails.assetSide.chain);

                            //asset faucet is NOT pure ERC721.. but it will do
                            const assetFaucet: AssetFaucet = new web3.eth.Contract(AssetFaucet_JSON.abi as any, loan.asset) as any;
                            
                            let owner:string;

                            try{
                                owner = await assetFaucet.methods.ownerOf(loan.tokenId).call();

                                //todo check if this is erc721 
                                //may be we can verify if all functions exist
                                //we should also check for approved of not the owner

                            }catch(error:any){
                                console.warn(`failed checking 721 validity ${error}`);
                                if((error||'').toString().includes('aren\'t valid')){
                                    throw new Error('Contract is not a supported ERC721')
                                }else{
                                    throw error;
                                }
                                
                            }

                            if(owner?.toLowerCase() != account.toLowerCase()){
                                throw new Error(`Your wallet ${account} does not own this token`);
                            }

                            const result ='NFT is approved';
                            setCheckNFT({result});

                        }catch(error:any){
                            setCheckNFT({error});
                        }

                    }}>
                    Verify NFT
            </Button>

        </Form.Group>

        {!!checkNFT?.isLoading && <Spinner animation="border" variant="success"/>}
        {!!checkNFT?.error && <ShowError error={checkNFT.error}/>}

    </Form></Container>;

}
