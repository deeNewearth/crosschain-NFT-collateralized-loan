import { useState, useEffect } from 'react';
import { Button, Spinner, Container, InputGroup, Form, Modal } from 'react-bootstrap';
import { useConnectCalls } from '../web3';
import { IAsyncResult, ShowError } from '../utils';

import { AssetSide } from '../../typechain/AssetSide';
import AssetSide_JSON from '../../typechain/AssetSide.json';

import { CashSide } from '../../typechain/CashSide';
import CashSide_JSON from '../../typechain/CashSide.json';


import { AssetFaucet } from '../../typechain/AssetFaucet';
import AssetFaucet_JSON from '../../typechain/AssetFaucet.json';

import { LoanStatusView, LoanStatus } from '../loanStatus/statusView';

import { useNavigate } from "react-router-dom";

import './steps.scss';

export function LoanRequestView() {
    const { connect, contractDetails } = useConnectCalls();
    const [sumbitted, setSubmitted] = useState<IAsyncResult<string>>();

    const navigate = useNavigate();

    const [loan, setLoan] = useState<{
        asset?: string;
        tokenId?: number;
        loanAmount?: string;
        duration?: number;
        interest?: number;
    }>({});

    const [checkNFT, setCheckNFT] = useState<IAsyncResult<string>>();

    const [loanStatus, setLoanStatus] = useState<LoanStatus>();

    const interestRate = 20; //20% per year

    useEffect(() => {
        if (!loan.loanAmount || !loan.duration) {
            setLoan({ ...loan, interest: undefined });
            return;
        }

        const loanAmount = Number.parseFloat(loan.loanAmount);
        if (!loanAmount) {
            setLoan({ ...loan, interest: undefined });
            return;
        }

        //todo: find more appropreate interest rate
        let interest = loanAmount * loan.duration * interestRate / (365 * 100);

        //lets limit the decimal places
        interest = Math.round(interest * 1000000) / 1000000;

        setLoan({ ...loan, interest });

    }, [loan.duration, loan.loanAmount])


    async function veriFyNFT() {

        try {
            setCheckNFT({ isLoading: true });

            if (!loan.asset)
                throw new Error('ERC721 address is required');

            if (undefined == loan.tokenId) {
                throw Error('TokenId is required');
            }

            const { web3, account } = await connect(contractDetails.assetSide.chain);

            //asset faucet is NOT pure ERC721.. but it will do
            const assetFaucet: AssetFaucet = new web3.eth.Contract(AssetFaucet_JSON.abi as any, loan.asset) as any;

            let owner: string;

            try {
                owner = await assetFaucet.methods.ownerOf(loan.tokenId).call();

                //todo check if this is erc721 
                //may be we can verify if all functions exist
                //we should also check for approved of not the owner

            } catch (error: any) {
                console.warn(`failed checking 721 validity ${error}`);
                if ((error || '').toString().includes('aren\'t valid')) {
                    throw new Error('Contract is not a supported ERC721')
                } else {
                    throw error;
                }

            }

            if (owner?.toLowerCase() != account.toLowerCase()) {
                throw new Error(`Your wallet ${account} does not own this token`);
            }

            const result = 'NFT is approved';
            setCheckNFT({ result });

            return true;

        } catch (error: any) {
            setCheckNFT({ error });
            return false;
        }

    }

    return <Container className="newLoan d-flex justify-content-center">

        {!!loanStatus && <Modal className="newLoanModal" show={true} onHide={() => setLoanStatus(undefined)}>
            <Modal.Header closeButton>
                <Modal.Title>New loan request</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <h5>You will need to approve a series of Transactions</h5>

                <div className="d-flex justify-content-center">
                    <LoanStatusView status={loanStatus} />
                </div>

                {!!sumbitted?.error && <ShowError error={sumbitted.error} />}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setLoanStatus(undefined)}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
        }


        <Form onSubmit={async e => {
            e.preventDefault();

            setLoanStatus(undefined);

            try {
                setSubmitted({ isLoading: true });


                Object.keys(loan).forEach(k => {
                    if (!(loan as any)[k]) {
                        throw new Error(`${k} is missing`);
                    }
                })

                if (!loan.duration) {
                    throw new Error('loan duration must be greater then or equal 1 day');
                }
                
                setLoanStatus({});

                let contractId:string;
                let secret1Hash:string;
                const lockedTill = Math.round(new Date().getTime() / 1000) + (3600 * 24 * loan.duration);

                {
                    const { web3: web3Asset, account: accountAsset, dataEncrypt, evmSecrethash } = await connect(contractDetails.assetSide.chain);
                    const assetSide: AssetSide = new web3Asset.eth.Contract(AssetSide_JSON.abi as any, contractDetails.assetSide.address) as any;


                    if (!loan.asset || !loan.tokenId) {
                        throw new Error('asset is not set');
                    }

                    contractId = await assetSide.methods.computeContractId(accountAsset, loan.asset, loan.tokenId).call();

                    const existing1 = await assetSide.methods.getContract1(contractId).call();

                    if (existing1.alexWallet !== '0x0000000000000000000000000000000000000000') {

                        const existing2 = await assetSide.methods.getContract2(contractId).call();
                        secret1Hash = existing2.secret1Hash;

                        setLoanStatus({ ...loanStatus, askforloan_assetside: { completed: true } });

                    } else {

                        if (! await veriFyNFT()) {
                            throw new Error('failed to deposit NFT');
                        }

                        //asset faucet is NOT pure ERC721.. but it will do
                        const asset: AssetFaucet = new web3Asset.eth.Contract(AssetFaucet_JSON.abi as any, loan.asset) as any;

                        const curentApproved = await asset.methods.getApproved(loan.tokenId).call();
                        if (contractDetails.assetSide.address == curentApproved) {
                            setLoanStatus({ ...loanStatus, approveTransfer: { completed: true } });

                        } else {
                            setLoanStatus({ ...loanStatus, approveTransfer: {} });

                            const tx = await asset.methods.approve(contractDetails.assetSide.address, loan.tokenId).send({
                                from: accountAsset
                            });

                            setLoanStatus({ ...loanStatus, approveTransfer: { completed: true, tx: tx.transactionHash } });
                        }

                        setLoanStatus({ ...loanStatus, create_secret1: {} });

                        //we create secrte by using the randomness provided by the web3 wallet creation 
                        const secret1 = web3Asset.utils.sha3(web3Asset.eth.accounts.create(new Date().toString()).privateKey);
                        if (!secret1) {
                            throw new Error('failed to create secret1');
                        }

                        const encryptedSecret1 = await dataEncrypt(secret1);
                        /*
                        const plainAgain = await dataDecrypter(encryptedSecret1);
                        const k = plainAgain == encryptedSecret1;
                        debugger;
                        */

                        setLoanStatus({
                            ...loanStatus,
                            create_secret1: { completed: true },
                            askforloan_assetside: {}
                        });


                        secret1Hash = evmSecrethash(secret1);

                        const tx1 = await assetSide.methods.askForLoan(
                            loan.asset, loan.tokenId, accountAsset,
                            secret1Hash, encryptedSecret1,
                            lockedTill
                        ).send({
                            from: accountAsset
                        });

                        setLoanStatus({ ...loanStatus, askforloan_assetside: { completed: true, tx: tx1.transactionHash } });
                    }
                }

                {
                    setLoanStatus({ ...loanStatus, prepare_cash_vault: {} });

                    const { web3: web3Cash, account: accountCash } = await connect(contractDetails.cashSide.chain);
                    const cashSide: CashSide = new web3Cash.eth.Contract(CashSide_JSON.abi as any, contractDetails.cashSide.address) as any;

                    const existing1 = await cashSide.methods.getContract1(contractId).call(); 
                    if (existing1.alexWallet !== '0x0000000000000000000000000000000000000000') {

                        setLoanStatus({ ...loanStatus, prepare_cash_vault: { completed: true } });

                    } else {


                        if(!loan.loanAmount || !loan.interest){
                            throw new Error('loan amount and interest are required');
                        }
    
                        const tx = await cashSide.methods.askForLoan(contractId,secret1Hash,
                            web3Cash.utils.toWei(loan.loanAmount,'ether'),
                            web3Cash.utils.toWei(loan.interest.toString(),'ether'),
                            lockedTill
                         ).send({
                             from:accountCash
                         });
        
                         setLoanStatus({ ...loanStatus, prepare_cash_vault: {completed:true, tx:tx.transactionHash} });
                       }

                }

                setSubmitted({result:'done'});

                navigate(`/status/${contractId}`);


            } catch (error: any) {
                setSubmitted({ error });
            }
        }} >

            <div className="text-center">
                <h4>New loan request</h4>
            </div>

            <Form.Label>NFT collateral</Form.Label>

            <Form.Group className="d-flex flex-sm-row flex-column align-items-center gap-2">

                <InputGroup className="token" hasValidation>

                    <Form.Control required placeholder="ERC721 address only" className="contractAddress flex-grow-1"
                        value={loan?.asset || ''}
                        isValid={checkNFT?.result ? true : undefined}
                        isInvalid={checkNFT?.error ? true : undefined}
                        onChange={e => setLoan({ ...loan, asset: e.target.value })}
                    />

                    <Form.Control required placeholder="tokenId" className="tokenId"
                        value={loan.tokenId?.toString() || ''}
                        isInvalid={!!checkNFT && !(loan.tokenId?.toString() || '')}
                        isValid={checkNFT?.result ? true : undefined}
                        onChange={e => {

                            if (!e.target.value) {
                                setLoan({ ...loan, tokenId: undefined });
                                return;
                            } else {
                                const tokenId = Number.parseInt(e.target.value);
                                if (!isNaN(tokenId)) {
                                    setLoan({ ...loan, tokenId });
                                }
                            }
                        }}
                    />

                </InputGroup>

                <Button variant="success" id="button-checknft" className="verifyBtn"
                    disabled={!!checkNFT?.isLoading} onClick={() => veriFyNFT()}>
                    Verify NFT
                </Button>

            </Form.Group>

            <div className="text-center">
                {!!checkNFT?.isLoading && <Spinner animation="border" variant="success" />}
                {!!checkNFT?.error && <ShowError error={checkNFT.error} />}
            </div>

            <Form.Group className="d-flex flex-sm-row flex-column align-items-center gap-2 mt-4 mb-2">

                <InputGroup hasValidation>

                    <InputGroup.Text className="bg-diff1">Loan amount</InputGroup.Text>

                    <Form.Control required placeholder="enter loan amount"
                        value={loan.loanAmount?.toString() || ''}

                        //isInvalid={!!checkNFT && !(loan.tokenId?.toString() || '')}
                        //isValid={checkNFT?.result ? true : undefined}
                        onChange={e => {

                            if (!e.target.value) {
                                setLoan({ ...loan, loanAmount: undefined });
                                return;
                            } else {
                                const loanAmount = e.target.value.replace(/[^0-9$.,]/g, '');
                                setLoan({ ...loan, loanAmount });
                            }
                        }}
                    />

                    <InputGroup.Text className="bg-diff1">ETH</InputGroup.Text>

                </InputGroup>

                <InputGroup >

                    <InputGroup.Text className="bg-diff1">For</InputGroup.Text>

                    <Form.Control required placeholder="loan duration"
                        value={loan.duration?.toString() || ''}

                        //isInvalid={!!checkNFT && !(loan.tokenId?.toString() || '')}
                        //isValid={checkNFT?.result ? true : undefined}
                        onChange={e => {

                            if (!e.target.value) {
                                setLoan({ ...loan, duration: undefined });
                                return;
                            } else {
                                const duration = Number.parseInt(e.target.value);
                                if (duration) {
                                    setLoan({ ...loan, duration });
                                }
                            }
                        }}
                    />

                    <InputGroup.Text className="bg-diff1">days</InputGroup.Text>

                </InputGroup>

            </Form.Group>

            {loan.interest && <div className="text-center">
                Loan interest @ {interestRate}% API = <strong>{loan.interest}</strong> ETH
            </div>}

            <div className="text-center mt-4">

                <Button variant="primary" type="submit" size='lg' className="loanBtn" disabled={!!sumbitted?.isLoading}>
                    Apply for loan
                </Button>

                {!!sumbitted?.isLoading && <div><span>Waitig for wallet</span> <Spinner animation="border" variant="success" /></div>}
                {!!sumbitted?.error && <ShowError error={sumbitted.error} />}


            </div>

        </Form></Container>;

}
