//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./common.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

//Alex wants to borrow  1 ETH on Arbitum against  CLBX-1123 on ETH network 
//This contract is deployed on ETH 

contract AssetSide is Common, IERC721Receiver {

    //STEP 1 -Called by Alex - Alex creates a loan record with Secret 1
    //Requires AlexToBe to be the owner, approved, or operator
    function askForLoan(
        address _asset,
        uint256 _tokenId,
        address _assetOwner,// It is possibe for alex to not be the Oner and just the operator for this asset

        bytes32 _secret1Hash,


        uint256 _reqTill, /* Bob has to deposit before this time. He cannot deposit afterwards. */
        uint256 _acceptTill, /* Alice has to withdraw funds before this time. She cannot deposit afterwards. */
        uint256 _lockedTill, /* Loan expiration */
        uint256 _releaseTill /* The time Bob has to reveal his secret if loan has been returned or trigger default */
    )
        external
        futureTimelock(_reqTill)
        futureTimelock(_acceptTill)
        futureTimelock(_lockedTill)
        futureTimelock(_releaseTill)
    {

        bytes32 _contractId = _computeContractId(_msgSender(), _asset, _tokenId);

        // Reject if a contract already exists with the same parameters. 
        if (haveContract(_contractId)) revert("Contract already exists");

        contracts[_contractId] = LockedLoan(
            _secret1Hash, 0,

            0,0,

            _asset,_tokenId,

            0,0,0,

            address(0),_msgSender(),

            state_created, //status

            _reqTill,
            _acceptTill,
            _lockedTill,
            _releaseTill
        );

        // This contract becomes the temporary owner of the asset
        ERC721(_asset).safeTransferFrom(
                _assetOwner,
                address(this),
                _tokenId
        );
        

        emit LoanRequest(_msgSender(), _asset,state_created,_contractId);
    }

    event LoanRequest(
        address indexed alexWallet,
        address indexed asset,
        uint256 indexed status,
        bytes32 contractId
    );

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external override returns (bytes4){
        _operator;
        _from;
        _tokenId;
        _data;
        emit Received();
        return this.onERC721Received.selector;
    }

    event Received();
    
    function noTakersForLoan(bytes32 _contractId) external {
        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_created,"must be state_created");
        require(c.reqTill < block.timestamp, "reqTill not yet passed");

        ERC721(c.assetContract).safeTransferFrom(
                address(this),
                c.alexWallet,
                c.tokenId
        );
    }

    /**
     * @dev STEP2: -Called by Bob - Bob funds the loan and the security deposit
     * @param _contractId Id of the Loan.
     * @param _secret2Hash A sha-2 sha256 hash for secret2 created by Bob.
    */
    function giveLoan(bytes32 _contractId, bytes32 _secret2Hash)
        external
        contractExists(_contractId)
    {
        //todo:  What happens if BOB creates secret 2 but never funds.. need Tanother timelock or no takers is good
        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_created,"must be state_created");
        

        c.secret2Hash = _secret2Hash;
        c.bobsWallet = _msgSender();
        c.status = state_bobFunded;

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
        c.status = state_movedToEscrow; //accepted
    }

    /**
    * @dev STEP4-1: Called by the Bob (or whoever) To get claim Collatoral loan has defaulted
    *
    * @param _contractId Id of the Load.
    * @param _preImage2 sha256(_preimage) should equal the contract hashlock.
    * @return bool true on success
     */
    function loanDefault(bytes32 _contractId, bytes32 _preImage2)
        external
        contractExists(_contractId)
      
        returns (bool)
    {
        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_movedToEscrow,"must be state_movedToEscrow");
        require(c.releaseTill < block.timestamp, "releaseTill not yet passed");
        ensureHashlockMatches(c.secret2Hash,_preImage2);

        c.preimage2 = _preImage2;
        c.status = state_defaulted; 

        // Send token to Bob
        ERC721(c.assetContract).safeTransferFrom(
                address(this),
                c.bobsWallet,
                c.tokenId
        );
        
        return true;
    }

    /**
     * @dev STEP5: - Called by Alex or Who ever
            Loan has been returned secret2 has been revealed by BOB
            The collatoral is to be returned to Alex
     *
     * @param _contractId Id of the Load.
     * @param _preImage2 sha256(_preimage) should equal the contract hashlock.
     */
    function releaseCollatoral(bytes32 _contractId, bytes32 _preImage2) 
        external contractExists(_contractId)
    {
        LockedLoan storage c = contracts[_contractId];
        require(c.status == state_movedToEscrow,"must be state_movedToEscrow");
        ensureHashlockMatches(c.secret2Hash,_preImage2);

        c.preimage2 = _preImage2;
        c.status = state_released; 

        // Send token to Alex
        ERC721(c.assetContract).safeTransferFrom(
                address(this),
                c.alexWallet,
                c.tokenId
        );

    }
}