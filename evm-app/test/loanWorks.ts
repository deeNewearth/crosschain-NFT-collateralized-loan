import { expect } from "chai";
import { ethers } from "hardhat";

import {AssetSide} from '../typechain/AssetSide';
import {CashSide} from '../typechain/CashSide';
import {AssetFaucet} from '../typechain/assetFaucet';

let assetSide:AssetSide;
let cashSide:CashSide;
let faucet:AssetFaucet;

describe("LoanWorks", function () {

    it("should deploy",async function(){
        const _assetfactory = await ethers.getContractFactory("AssetSide");
        assetSide = await _assetfactory.deploy();

        const _cashfactory = await ethers.getContractFactory("CashSide");
        cashSide = await _cashfactory.deploy();

        const _faucetfactory = await ethers.getContractFactory("AssetFaucet");
        faucet = await _faucetfactory.deploy();
        
        console.log('all deployed');
    });

    it("Alex should ask for loan STEP-1", async function (){

        const [deployer, alex, bob] = await ethers.getSigners();

        const tx1 = await faucet.connect(alex).giveMe();
        await tx1.wait();

        expect( await faucet.ownerOf(1)).to.be.eq(alex.address);

        const tx2 = await faucet.connect(alex).approve(assetSide.address,1);
        await tx2.wait();

        const preImage1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes( 'secret1'));
        const abiCoder =new ethers.utils.AbiCoder(); 
        const encoded =  abiCoder.encode(['bytes32'], [preImage1]);
        const secret1Hash  = ethers.utils.keccak256(encoded);

        const currentTimeInSec = Math.round((new Date()).getTime() / 1000);
        const tomorrow = currentTimeInSec + (3600 * 24);
        const afterTomorrow = tomorrow + (3600 * 24);
        const loanEnds = currentTimeInSec + (3600 * 24 * 7); //loan good for 7 days
        const releaseEnd = loanEnds + (3600 * 24); //day after loan ends

        console.log('asset approved asking for loan');

        const tx3 = await assetSide.connect(alex).askForLoan(
            faucet.address,1,
            alex.address,secret1Hash,
            tomorrow,afterTomorrow,loanEnds,releaseEnd);
        await tx3.wait();

        const contractId = await assetSide.computeContractId(alex.address,faucet.address,1);

        const contract_assetSide = await assetSide.getContract1(contractId);
        expect(contract_assetSide.alexWallet).to.be.eq(alex.address);

        expect(await faucet.ownerOf(1)).to.be.eq(assetSide.address);

        const loanAmount = ethers.utils.parseUnits("1.0",'ether');
        const interestAmount = loanAmount.mul(20).div(100);

        console.log(`interest Amount is ${ethers.utils.formatEther(interestAmount)}`);

        const tx4 = await cashSide.connect(alex).askForLoan(contractId,secret1Hash,
            loanAmount,interestAmount,
            tomorrow,afterTomorrow,loanEnds,releaseEnd);
        await tx4.wait();

        const contract_cashSide = await cashSide.getContract1(contractId);
        expect(contract_cashSide.alexWallet).to.be.eq(alex.address);


    });

    
});