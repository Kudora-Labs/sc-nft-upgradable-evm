import { ethers, upgrades } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type {
    BatchMintExtension,
    MetadataRendererExtension,
    NFTCore,
    Router,
    SingleMintExtension,
} from "../../typechain-types";

export type TestFixture = {
    owner: HardhatEthersSigner;
    user1: HardhatEthersSigner;
    user2: HardhatEthersSigner;
    unauthorized: HardhatEthersSigner;
    router: Router;
    nftCore: NFTCore;
    singleMintExtension: SingleMintExtension;
    batchMintExtension: BatchMintExtension;
    metadataRendererExtension: MetadataRendererExtension;
};

export const deployFixture = async (): Promise<TestFixture> => {
    const [owner, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy Router (upgradeable)
    const routerFactory = await ethers.getContractFactory("Router");
    const router = (await upgrades.deployProxy(routerFactory, [owner.address], {
        initializer: "initialize",
    })) as unknown as Router;

    await router.waitForDeployment();

    // Deploy NFTCore
    const nftCoreFactory = await ethers.getContractFactory("NFTCore");
    const nftCore = (await nftCoreFactory.deploy(await router.getAddress())) as unknown as NFTCore;

    await nftCore.waitForDeployment();

    // Deploy Extensions
    const singleMintExtensionFactory = await ethers.getContractFactory("SingleMintExtension");
    const singleMintExtension = (await singleMintExtensionFactory.deploy(
        await router.getAddress(),
    )) as unknown as SingleMintExtension;

    await singleMintExtension.waitForDeployment();

    const batchMintExtensionFactory = await ethers.getContractFactory("BatchMintExtension");
    const batchMintExtension = (await batchMintExtensionFactory.deploy(
        await router.getAddress(),
    )) as unknown as BatchMintExtension;

    await batchMintExtension.waitForDeployment();

    const metadataRendererExtensionFactory = await ethers.getContractFactory(
        "MetadataRendererExtension",
    );
    const metadataRendererExtension = (await metadataRendererExtensionFactory.deploy(
        await router.getAddress(),
    )) as unknown as MetadataRendererExtension;

    await metadataRendererExtension.waitForDeployment();

    // Configure Router
    await router.setNFTCore(await nftCore.getAddress());
    await router.setSingleMintExtension(await singleMintExtension.getAddress());
    await router.setBatchMintExtension(await batchMintExtension.getAddress());
    await router.setMetadataRendererExtension(await metadataRendererExtension.getAddress());

    return {
        owner,
        user1,
        user2,
        unauthorized,
        router,
        nftCore,
        singleMintExtension,
        batchMintExtension,
        metadataRendererExtension,
    };
};

export const sampleCoreMetadata = {
    collection: "Test Collection",
    creator: "Test Creator",
    description: "Test Description",
    tokenName: "Test Token",
    supply: "1000",
};

export const sampleMediaMetadata = {
    image: "https://example.com/image.png",
    video: "https://example.com/video.mp4",
};

export const sampleCoreMetadata2 = {
    collection: "Second Collection",
    creator: "Second Creator",
    description: "Second Description",
    tokenName: "Second Token",
    supply: "500",
};

export const sampleMediaMetadata2 = {
    image: "https://example.com/image2.png",
    video: "https://example.com/video2.mp4",
};
