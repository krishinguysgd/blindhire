import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer account available. Set PRIVATE_KEY in your shell, .env.local, or .env.");
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const gasLimit = process.env.DEPLOY_GAS_LIMIT ? BigInt(process.env.DEPLOY_GAS_LIMIT) : undefined;
  const maxFeePerGas = process.env.DEPLOY_MAX_FEE_GWEI
    ? hre.ethers.parseUnits(process.env.DEPLOY_MAX_FEE_GWEI, "gwei")
    : undefined;
  const maxPriorityFeePerGas = process.env.DEPLOY_PRIORITY_FEE_GWEI
    ? hre.ethers.parseUnits(process.env.DEPLOY_PRIORITY_FEE_GWEI, "gwei")
    : undefined;

  console.log(`Deploying BlindHire from ${deployer.address}`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);

  const BlindHire = await hre.ethers.getContractFactory("BlindHire");
  const blindHire = await BlindHire.deploy({
    ...(gasLimit ? { gasLimit } : {}),
    ...(maxFeePerGas ? { maxFeePerGas } : {}),
    ...(maxPriorityFeePerGas ? { maxPriorityFeePerGas } : {}),
  });
  await blindHire.waitForDeployment();

  const address = await blindHire.getAddress();
  const receipt = await blindHire.deploymentTransaction()?.wait();
  const deployBlock = receipt?.blockNumber;
  console.log(`BlindHire deployed to ${address}`);
  console.log(`NEXT_PUBLIC_BLINDHIRE_CONTRACT_ADDRESS=${address}`);
  if (deployBlock) console.log(`NEXT_PUBLIC_BLINDHIRE_DEPLOY_BLOCK=${deployBlock}`);
  if (receipt?.gasUsed) console.log(`Deployment gas used: ${receipt.gasUsed.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
