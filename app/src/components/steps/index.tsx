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

export type LoanReqEventprops = {
    alexWallet: string;
    asset: string;
    contractId: string;
    status: string;
}

export type LoanDetails = {
    assetContract: string;
    tokenId: string;
    loanAmount: string;
    loanInterest: string;
    lenderDeposit: string;
    bobsWalet: string;
    alexWallet: string;
    status: string;
}

export type LoanStats = {
    assetExisting1: LoanDetails;
    cashExisting1: LoanDetails;
    formated: {
        loanAmount: string;
        loanInterest: string;
    }
}

export function LoanStepView({ stats: { assetExisting1: { status } } }: {
    stats: LoanStats;
}) {
    const [submitted,setSubmitted] = useState<IAsyncResult<boolean>>();

    const ActionView = () => {
        switch (status) {
            case '0':  //Loan requested
                return <Button variant='primary' size="lg" m-3 p-2 onClick={()=>{
                    setSubmitted({error:new Error('not yet implemented')})
                }}>
                    Fund the loan
                </Button>
            default:
                return <div></div>;
        }
    }

    return <div className='text-center'>
            <ActionView/>

            {!!submitted?.isLoading && <Spinner animation="border" variant="primary" />}
            {!!submitted?.error && <ShowError error={submitted.error} />}

    </div>;
}