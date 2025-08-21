import dotenv from "dotenv";
import hre from "hardhat";
import { routerModule } from "../../ignition/modules/Router";
import { Router__factory } from "../../typechain-types";
import { logGasReport } from "../log/logGasReport";
import { getMetadataPath } from "../shared/fs/getMetadataPath";
import type { NFTMetadata } from "../shared/metadata/nftMetadataSchemas";
import { toMintContractMetadata } from "../shared/metadata/nftMetadataToContract";
import { parseAndValidateMetadata } from "../shared/metadata/parseNftMetadata";
import { computeGasReport } from "../utils/computeGasReport";

dotenv.config();
const { ethers, ignition } = hre;

const mustEnv = (k: string): string => {
    const v = process.env[k];

    if (!v) {
        console.error(`❌ ${k} not defined in .env`);
        process.exit(1);
    }

    return v;
};

const main = async () => {
    const collection = mustEnv("COLLECTION");
    const nftIdStr = mustEnv("NFT_ID");
    const destinationWallet = mustEnv("MINT_DESTINATION_WALLET");

    const network = hre.network.name;
    const nftId = parseInt(nftIdStr);

    if (isNaN(nftId)) {
        console.error("❌ NFT_ID must be a number");
        process.exit(1);
    }

    const metadataPath = getMetadataPath(collection, nftId);

    let metadata: NFTMetadata;

    try {
        metadata = parseAndValidateMetadata(metadataPath);
    } catch (error) {
        console.error("❌ Error loading metadata:", error);
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();

    console.log(`\nMinting NFT on ${network}:`);
    console.log(`Collection: ${collection}`);
    console.log(`Wallet: ${await deployer.getAddress()}\n`);

    const deployment = await ignition.deploy(routerModule);
    const routerAddress = await deployment.routerInstance.getAddress();

    const router = Router__factory.connect(routerAddress, ethers.provider);
    const { core: coreMetadata, media: mediaMetadata } = toMintContractMetadata(metadata);

    console.log({ to: destinationWallet, nftId, coreMetadata, mediaMetadata });

    console.log("⏳ Minting NFT via router...");
    const tx = await router
        .connect(deployer)
        .handleSingleMint(destinationWallet, nftId, coreMetadata, mediaMetadata);

    console.log("✅ Transaction sent:", tx.hash);
    const receipt = await tx.wait();

    if (!receipt) {
        throw new Error("❌ Transaction receipt is null");
    }

    const gasReport = await computeGasReport(receipt, { txGasPrice: tx.gasPrice });

    console.log("✅ NFT minted successfully!");
    logGasReport(gasReport);
};

const run = async () => {
    await main();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
