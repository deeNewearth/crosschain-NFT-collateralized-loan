import { useState, useEffect } from 'react';
import { Button, Spinner, Container, } from 'react-bootstrap';
import { useConnectCalls } from '../web3';
import { IAsyncResult, ShowError } from '../utils';

import { AssetSide } from '../../typechain/AssetSide';
import AssetSide_JSON from '../../typechain/AssetSide.json';

import { ShowCompacted } from '../utils/display';

import { LinkContainer } from 'react-router-bootstrap';
import {LoanStatusVals} from './index';

import './loans.scss';

type LoanReqEventprops = {
    alexWallet: string;
    asset: string;
    contractId: string;
    status: string;
}

export default function LoanList() {
    const { readOnly, contractDetails } = useConnectCalls();
    const [list, setList] = useState<IAsyncResult<LoanReqEventprops[]>>();

    async function loadLoan() {
        try {
            setList({ isLoading: true });

            {
                const { web3ro: web3AssetRO } = await readOnly(contractDetails.assetSide.chain);
                const assetSideRO: AssetSide = new web3AssetRO.eth.Contract(AssetSide_JSON.abi as any, contractDetails.assetSide.address) as any;


                const eventList = await assetSideRO.getPastEvents('LoanRequest', {
                    fromBlock: '0',
                    toBlock: 'latest'
                });

                const result = eventList.map(e => e.returnValues as LoanReqEventprops);

                setList({ result });

            }


        } catch (error: any) {
            setList({ error });
        }
    }


    useEffect(() => {

        loadLoan();

    }, []);

    return <Container className="text-center loanList">

        <LinkContainer to="/new">
            <Button className="p-3 m-5" size="lg">
                Apply for new loan
            </Button>
        </LinkContainer>


        <hr />

        <div className="text-center">
            <h4>Recent loans</h4>
            {!!list?.isLoading && <Spinner animation="border" variant="primary" />}
            {!!list?.error && <ShowError error={list.error} />}
        </div>

        <table className="loanTable">
            <thead>
                <tr>
                    <th>contract Id</th>
                    <th>asset</th>
                    <th>borrower</th>
                    <th>status</th>
                </tr>
            </thead>
            <tbody>
                {(list?.result || []).map((e, i) => <tr key={i}>

                    <td>
                        <LinkContainer to={`/status/${e.contractId}`}>
                            <Button variant='link'>
                                <ShowCompacted str={e.contractId} />
                            </Button>
                        </LinkContainer>
                        
                    </td>
                    <td><ShowCompacted str={e.asset} type='address' /></td>
                    <td><ShowCompacted str={e.alexWallet} type='address' /></td>
                    <td>{LoanStatusVals[e.status]||e.status.toString()}</td>
                </tr>)}
            </tbody>

        </table>



    </Container>;
}