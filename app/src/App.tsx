import './App.scss';
import { HashRouter, Link, Routes, Route } from 'react-router-dom';
import { Button, Nav, Navbar,Container } from 'react-bootstrap';
import {LinkContainer} from 'react-router-bootstrap';

//import { ConnectWallet, Web3Provider, useweb3Context, useConnectCalls } from './components/web3';
import { Web3Provider } from './components/web3';

import { ShowCompacted } from './components/utils/display';

import LoanStatusView from './components/loanStatus';
import LoanList from './components/loanStatus/list';

import FaucetView from './components/faucet';
import {LoanRequestView} from './components/steps/newLoan';

function Topbar() {

  return <Navbar collapseOnSelect expand="md" bg="dark" variant="dark">
    <Container>
      <LinkContainer to="/">
        <Navbar.Brand >NFT loans</Navbar.Brand>
      </LinkContainer>
      <Navbar.Toggle aria-controls="responsive-navbar-nav" />

      <Navbar.Collapse id="responsive-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link href="#">Features</Nav.Link>
          <Nav.Link href="#">Pricing</Nav.Link>
        </Nav>
        <Nav>
          <LinkContainer to="/faucet">
            <Nav.Link >
              test faucet
            </Nav.Link>
          </LinkContainer>
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
}


function MainContent() {

  /*
  const web3Ctx = useweb3Context();

  if( (!web3Ctx?.account) || web3Ctx?.reconnecting){
    return <ConnectWallet />;
  }
  */

  return <Routes>
    <Route path="/" element={<LoanList />} />
    <Route path="/faucet" element={<FaucetView />} />
    <Route path="/status/:contractId" element={<LoanStatusView />} />
    <Route path="/new" element={<LoanRequestView />} />

    <Route path="*" element={<div>404 - nothing here</div>} />

  </Routes>;

}

export default function () {
  return <Web3Provider><HashRouter>
    <div className='app d-flex flex-column'>

      <Topbar />

      <div className='flex-grow-1 d-flex justify-content-center align-items-center'>
        <MainContent />
      </div>


    </div>
  </HashRouter></Web3Provider>;
};
