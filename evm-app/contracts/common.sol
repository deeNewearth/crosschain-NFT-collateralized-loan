//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


//we are using Ownable to transfer "fees" for loan operations
abstract contract  Common is Ownable{
    

    struct LockedLoan {
        bytes32 secret1Hash;
        bytes32 secret2Hash;
        
        bytes32 preimage1; //revealed secret1
        bytes32 preimage2; //revealed secret2

        //address  and tokenId of the ERC721 asset
        address assetContract;
        uint256 tokenId;

        uint256 loanAmount;
        uint256 loanInterest;
        uint256 lenderDeposit;
        
        address bobsWallet;
        address alexWallet;
        
        uint8 status;
        
        //Alex's Loan request is good till this timestamp. Bob has to deposit funds before this time
        uint256 reqTill; 

        //Alex has to withdraw Bob's funds BEFORE this time
        uint256 acceptTill;

        //The Loan is Locked Till This time
        uint256 lockedTill;

        //After loan is returned BOB has to release the collatoral BEFORE this time
        uint256 releaseTill;
        
    }

    mapping (bytes32 => LockedLoan) public contracts;

    uint8 constant state_created =0;
    uint8 constant state_bobFunded =1;
    uint8 constant state_movedToEscrow =2;
    uint8 constant state_refundToBob =3;
    uint8 constant state_refundToAlex =4;
    uint8 constant state_returned =5;
    uint8 constant state_defaulted =6;
    uint8 constant state_released =7;
    uint8 constant state_fortified =8;

    modifier contractExists(bytes32 _contractId) {
        require(haveContract(_contractId), "contractId does not exist");
        _;
    }

    //the contract Id is calculated by packing these parameters together
    //Alex cannot create 2 loans for the same token
    function _computeContractId(address _alexWallet, address _asset, uint256 _tokenId) internal pure returns (bytes32)
    {
        return  keccak256(abi.encodePacked(_alexWallet,_asset,_tokenId));
    }

    modifier futureTimelock(uint256 _time) {
        // only requirement is the timelock time is after the last blocktime (now).
        // probably want something a bit further in the future then this.
        // but this is still a useful sanity check:
        require(_time > block.timestamp, "timelock time must be in the future");
        _;
    }

    function ensureHashlockMatches(bytes32 _hashLock, bytes32 _preImage) internal pure {
        require(
            _hashLock == keccak256(abi.encode(_preImage)),
            "hashlock hash does not match"
        );
    }

    /**
     * @dev Is there a contract with id _contractId.
     * @param _contractId Id into contracts mapping.
     */
    function haveContract(bytes32 _contractId)
        internal
        view
        returns (bool exists)
    {
        exists = (contracts[_contractId].alexWallet != address(0));
    }

    /**
     * @dev Get contract details.
     * @param _contractId HTLC contract id
     *
     */
    function getContract(bytes32 _contractId)
        public
        view
        returns (
        bytes32 secret1Hash,
        bytes32 secret2Hash,
        
        bytes32 preimage1, //revealed secret1
        bytes32 preimage2, //revealed secret2

        //address  and tokenId of the ERC721 asset
        address assetContract,
        uint256 tokenId,

        uint256 loanAmount,
        uint256 loanInterest,
        uint256 lenderDeposit,

        
        address bobsWalet,
        address alexWallet,
        
        uint8 status,
        
        //Alex's Loan request is good till this timestamp. Bob has to deposit funds before this time
        uint256 reqTill,

        //Alex has to withdraw Bob's funds BEFORE this time
        uint256 acceptTill,

        //The Loan is Locked Till This time
        uint256 lockedTill,

        //After loan is returned BOB has to release the collatoral BEFORE this time
        uint256 releaseTill
        )
    {
        if (haveContract(_contractId) == false)
            return (
                0,0, 
                0,0, 
                address(0), 0, 
                
                0,0,0,
                
                address(0), address(0),  
                
                0,  
                
                0, 0, 0, 0);

        LockedLoan storage c = contracts[_contractId];
        return (
            c.secret1Hash,
            c.secret2Hash,
            c.preimage1,
            c.preimage2,
            c.assetContract,
            c.tokenId,
            c.loanAmount, 
            c.loanInterest,
            c.lenderDeposit,
            c.bobsWallet,
            c.alexWallet,
            c.status,
            
            c.reqTill,
            c.acceptTill,
            c.lockedTill,
            c.releaseTill
        );
    }

}