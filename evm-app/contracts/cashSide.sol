//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./common.sol";

//Alex wants to borrow  1 ETH on Arbitum against  CLBX-1123 on ETH network 
//This contract is deployed on Arbitum

contract CashSide is Common {

    //STEP 1 -Called by Alex - Alex creates a loan record with Secret 1
    function askForLoan(
        bytes32 _contractId,
        bytes32 _secret1Hash,

        uint256 _loanAmount,
        uint256 _loanInterest,

        uint256 _reqTill,
        uint256 _acceptTill,
        uint256 _lockedTill,
        uint256 _releaseTill
    )
        external
        futureTimelock(_reqTill)
        futureTimelock(_acceptTill)
        futureTimelock(_lockedTill)
        futureTimelock(_releaseTill)
    {
        require(_loanAmount > 0, "amount must be > 0");

        // Reject if a contract already exists with the same parameters. 
        if (haveContract(_contractId)) revert("Contract already exists");

        contracts[_contractId] = LockedLoan(
            _secret1Hash, 0,

            0,0,

            address(0),0,

            _loanAmount,_loanInterest,_loanAmount, //lender deposit is same as loanamount

            address(0),_msgSender(),

            state_created, //status

            _reqTill,
            _acceptTill,
            _lockedTill,
            _releaseTill
        );

    }

    //Step2- called by Bob - Bob is funding the loan
    function giveLoan(
        bytes32 _contractId,
        bytes32 _secret2Hash
    )
        external payable contractExists(_contractId)
    {

        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_created,"must be state_created");
        require(msg.value >= (c.loanAmount+c.lenderDeposit),"not the correct amount");

        c.secret2Hash = _secret2Hash;
        
        c.bobsWallet = _msgSender();
        c.status = state_bobFunded;

        emit LoanGiven(c.alexWallet, c.bobsWallet, c.status, _contractId);

    }

    event LoanGiven(
        address indexed alexWallet,
        address indexed bobsWallet,
        uint256 indexed status,
        bytes32 contractId
    );


    //alex didn't take the loan the money needs to go back to bob
    function noTakersForLoan(/*bytes32 _contractId*/) external pure {
        //LockedLoan storage c = contracts[_contractId];
        //need to verify that the blockTime past _reqTill and state 
        // and refund the asset
        require(false,"todo: not implemented");
        //require(_ms);

    }

        /**
     * @dev STEP3:  -Called by Alex - Bob has funded the Loan and Alex is accepting the loan
                    Only Alex knows secret1 so we don't care who the message sender etc is
                    Alex Should NOT call this method before she has ensured that she has access to Loan Funds
     *
     * @param _contractId Id of the Load.
     * @param _preImage1 sha256(_preimage) should equal the contract hashlock.
     */
    function acceptLoan(bytes32 _contractId, bytes32 _preImage1)
        external
        contractExists(_contractId)
    {
        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_bobFunded,"must be state_bobFunded");
        ensureHashlockMatches(c.secret1Hash,_preImage1);

        c.preimage1 = _preImage1;
        c.status = state_movedToEscrow;

        payable(c.alexWallet).transfer(c.loanAmount);
    }



}