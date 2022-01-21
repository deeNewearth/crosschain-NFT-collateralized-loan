import React from 'react';
import logo from './logo.svg';
import './App.scss';
import {HashRouter, Link, Routes, Route} from 'react-router-dom';
import { Button, Nav, Navbar } from 'react-bootstrap';

import { ConnectWallet, Web3Provider, useweb3Context, useConnectCalls } from './components/web3';

import { ShowAddress } from './components/utils/display';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons'


function Topbar() {
  const web3Ctx = useweb3Context();
  const { disconnect } = useConnectCalls();

  if (!web3Ctx?.account)
    return null;

  return <div className='topBar d-flex flex-row justify-content-end pe-2 text-white-50 align-items-end'>
    <span className='me-2 chainName'>{web3Ctx.chainInfo.name}:</span>
    <ShowAddress address={web3Ctx.account} />
    <Button className="accountBtn" variant="link" onClick={async () => {
      try {
        await disconnect();
      } catch (error: any) {
        console.error(`failed to disconnect ${error}`);
      }
    }}>
      <FontAwesomeIcon icon={faSignOutAlt} />
    </Button>
  </div>;
}

function MainContent() {

  /*
  const web3Ctx = useweb3Context();

  if( (!web3Ctx?.account) || web3Ctx?.reconnecting){
    return <ConnectWallet />;
  }
  */

  return <div>hello world</div>;
  
}

export default function () {
  return <Web3Provider>
    <div className='app d-flex flex-column'>

      <Topbar />

      <div className='flex-grow-1 d-flex justify-content-center align-items-center'>
        <MainContent />
      </div>


    </div>
  </Web3Provider>;
};
