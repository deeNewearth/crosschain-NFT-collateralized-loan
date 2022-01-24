import { useState, useEffect } from 'react';
import { Button, Spinner, Container, Row, Col, Modal } from 'react-bootstrap';
import { useConnectCalls } from '../web3';
import { IAsyncResult, ShowError } from '../utils';

import { AssetSide } from '../../typechain/AssetSide';
import AssetSide_JSON from '../../typechain/AssetSide.json';

import { CashSide } from '../../typechain/CashSide';
import CashSide_JSON from '../../typechain/CashSide.json';

import { ShowCompacted } from '../utils/display';

import { AssetFaucet } from '../../typechain/AssetFaucet';
import AssetFaucet_JSON from '../../typechain/AssetFaucet.json';

import { LoanStatusView, LoanStatus } from '../loanStatus/statusView';
import { useParams } from 'react-router-dom';

import {LoanReqEventprops, LoanDetails, LoanStats, LoanStepView} from '../steps';


export const LoanStatusVals: { [status: string]: string } = {
    '0': 'Loan requested',
    '1': 'Funded by lender',
    '2': 'In term',
    '3': 'Refunded to lender',
    '4': 'Refunded to borrower',
    '5': 'Loan has been returned',
    '6': 'Loan has defaulted',
    '7': 'Collateral has been released',
    '8': 'Lender failed to release collateral'
}


export default function LoanStatusScreen() {
    const { readOnly, contractDetails } = useConnectCalls();
    const { contractId } = useParams();
    const [loanStatus, setLoanStatus] = useState<IAsyncResult<LoanStats>>();

    async function loadLoan() {
        try {
            setLoanStatus({ isLoading: true });

            if (!contractId) {
                throw new Error('no contractId set');
            }

            {
                const { web3ro: web3AssetRO } = await readOnly(contractDetails.assetSide.chain);
                const assetSideRO: AssetSide = new web3AssetRO.eth.Contract(AssetSide_JSON.abi as any, contractDetails.assetSide.address) as any;
                const assetExisting1: LoanDetails = await assetSideRO.methods.getContract1(contractId).call();

                const { web3ro: web3CashRO } = await readOnly(contractDetails.cashSide.chain);
                const cashSideRO: CashSide = new web3CashRO.eth.Contract(CashSide_JSON.abi as any, contractDetails.cashSide.address) as any;
                const cashExisting1: LoanDetails = await cashSideRO.methods.getContract1(contractId).call();



                if (assetExisting1.alexWallet === '0x0000000000000000000000000000000000000000') {
                    throw new Error(`contractId ${contractId} does not exist on asset side`);
                }
                if (cashExisting1.alexWallet === '0x0000000000000000000000000000000000000000') {
                    throw new Error(`contractId ${contractId} does not exist on cash side`);
                }

                setLoanStatus({
                    result: {
                        assetExisting1, cashExisting1,
                        formated: {
                            loanAmount: web3AssetRO.utils.fromWei(cashExisting1.loanAmount, 'ether'),
                            loanInterest: web3AssetRO.utils.fromWei(cashExisting1.loanInterest, 'ether'),
                        }
                    }
                });

            }


        } catch (error: any) {
            setLoanStatus({ error });
        }
    }


    useEffect(() => {

        loadLoan();

    }, [contractId]);

    

    return <Container>

        <div >
            <h4>Status :  { loanStatus?.result?.assetExisting1.status && 
                LoanStatusVals[loanStatus?.result?.assetExisting1.status] ||''}  </h4>
            {!!loanStatus?.isLoading && <Spinner animation="border" variant="primary" />}
            {!!loanStatus?.error && <ShowError error={loanStatus.error} />}
        </div>

        {!!loanStatus?.result && <div>

            <Row>
                <Col md> 
                    <div>Loan amount : ${loanStatus.result.formated.loanAmount} ETH</div>
                    <div> Interest : ${loanStatus.result.formated.loanInterest} ETH</div>
                    <div className="d-flex gap-2">
                        <span>Asset:</span>
                        <ShowCompacted str={loanStatus.result.assetExisting1.assetContract} />
                        <span> - {loanStatus.result.assetExisting1.tokenId} </span>
                    </div>
                </Col>
                
                <Col md>
                    <div className="d-flex gap-2">
                        <span>Borrower:</span>
                        <ShowCompacted str={loanStatus.result.assetExisting1.alexWallet} />
                    </div>
    
                    <div className="d-flex gap-2">
                        <span>lender:</span>
                        {loanStatus.result.assetExisting1.bobsWalet &&
                             <ShowCompacted str={loanStatus.result.assetExisting1.alexWallet} />}
                    </div>
                    
                </Col>
            </Row>

            <hr/>

            <LoanStepView stats={loanStatus?.result}/>

    
        </div>
        }


    </Container>;
}