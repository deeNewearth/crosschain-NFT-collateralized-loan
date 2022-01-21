import { ethers } from "hardhat";

//set PRIVATE_KEY=0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//npx hardhat run scripts/deploy-cashSide.ts --network arbitrum_testnet
async function main() {

  const [deployer] = await ethers.getSigners();

  console.log(`deploying CashSide with account ${deployer.address}`);

  const factory = await ethers.getContractFactory("CashSide");
  const contract = await factory.deploy();
  await contract.deployed();

  console.log("CashSide deployed to:", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
