import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Deploying BlindHire from ${deployer.address}`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);

  const BlindHire = await hre.ethers.getContractFactory("BlindHire");
  const blindHire = await BlindHire.deploy();
  await blindHire.waitForDeployment();

  const address = await blindHire.getAddress();
  console.log(`BlindHire deployed to ${address}`);
  console.log(`NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
