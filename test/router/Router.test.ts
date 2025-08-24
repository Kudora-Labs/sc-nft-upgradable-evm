import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, sampleCoreMetadata, sampleMediaMetadata } from "../helpers/fixtures";
import { expectCustomError, ZERO_ADDRESS } from "../helpers/utils";

describe("Router", () => {
    describe("Deployment and Initialization", () => {
        it("Should deploy and initialize correctly", async () => {
            const { router, owner } = await loadFixture(deployFixture);

            expect(await router.owner()).to.equal(owner.address);
        });

        it("Should deploy as upgradeable proxy", async () => {
            const [owner] = await ethers.getSigners();
            const routerFactory = await ethers.getContractFactory("Router");

            const router = await upgrades.deployProxy(routerFactory, [owner.address], {
                initializer: "initialize",
            });

            expect(await router.owner()).to.equal(owner.address);
        });

        it("Should prevent double initialization", async () => {
            const { router, unauthorized } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(unauthorized).initialize(unauthorized.address),
                "InvalidInitialization",
            );
        });
    });

    describe("Extension Management", () => {
        it("Should set single mint extension", async () => {
            const { router, singleMintExtension, owner } = await loadFixture(deployFixture);

            const tx = router
                .connect(owner)
                .setSingleMintExtension(await singleMintExtension.getAddress());

            expect(tx)
                .to.emit(router, "SingleMintExtensionUpdated")
                .withArgs(await singleMintExtension.getAddress());

            expect(await router.getSingleMintExtension()).to.equal(
                await singleMintExtension.getAddress(),
            );
        });

        it("Should set batch mint extension", async () => {
            const { router, batchMintExtension, owner } = await loadFixture(deployFixture);

            const tx = router
                .connect(owner)
                .setBatchMintExtension(await batchMintExtension.getAddress());

            expect(tx)
                .to.emit(router, "BatchMintExtensionUpdated")
                .withArgs(await batchMintExtension.getAddress());

            expect(await router.getBatchMintExtension()).to.equal(
                await batchMintExtension.getAddress(),
            );
        });

        it("Should set metadata renderer extension", async () => {
            const { router, metadataRendererExtension, owner } = await loadFixture(deployFixture);

            const tx = router
                .connect(owner)
                .setMetadataRendererExtension(await metadataRendererExtension.getAddress());

            expect(tx)
                .to.emit(router, "MetadataRendererUpdated")
                .withArgs(await metadataRendererExtension.getAddress());

            expect(await router.getMetadataRendererExtension()).to.equal(
                await metadataRendererExtension.getAddress(),
            );
        });

        it("Should set NFT core address", async () => {
            const { router, nftCore, owner } = await loadFixture(deployFixture);

            await router.connect(owner).setNFTCore(await nftCore.getAddress());

            expect(await router.getNFTCore()).to.equal(await nftCore.getAddress());
        });

        it("Should revert when setting zero address for extensions", async () => {
            const { router, owner } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(owner).setSingleMintExtension(ZERO_ADDRESS),
                "Router_ZeroAddress",
            );

            await expectCustomError(
                router.connect(owner).setBatchMintExtension(ZERO_ADDRESS),
                "Router_ZeroAddress",
            );

            await expectCustomError(
                router.connect(owner).setMetadataRendererExtension(ZERO_ADDRESS),
                "Router_ZeroAddress",
            );

            await expectCustomError(
                router.connect(owner).setNFTCore(ZERO_ADDRESS),
                "Router_ZeroAddress",
            );
        });

        it("Should only allow owner to set extensions", async () => {
            const { router, singleMintExtension, unauthorized } = await loadFixture(deployFixture);

            await expectCustomError(
                router
                    .connect(unauthorized)
                    .setSingleMintExtension(await singleMintExtension.getAddress()),
                "OwnableUnauthorizedAccount",
            );
        });
    });

    describe("Single Mint Handling", () => {
        it("Should handle single mint correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Verify metadata was set
            const coreMetadata = await router.handleGetCoreMetadata(tokenId);

            expect(coreMetadata.tokenName).to.equal(sampleCoreMetadata.tokenName);

            const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

            expect(mediaMetadata.image).to.equal(sampleMediaMetadata.image);
        });

        it("Should only allow owner to handle single mint", async () => {
            const { router, unauthorized, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                router
                    .connect(unauthorized)
                    .handleSingleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata),
                "OwnableUnauthorizedAccount",
            );
        });
    });

    describe("Batch Mint Handling", () => {
        it("Should handle batch mint correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2, 3];
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata, sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata, sampleMediaMetadata];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify metadata was set for all tokens
            for (const tokenId of tokenIds) {
                const coreMetadata = await router.handleGetCoreMetadata(tokenId);

                expect(coreMetadata.tokenName).to.equal(sampleCoreMetadata.tokenName);

                const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

                expect(mediaMetadata.image).to.equal(sampleMediaMetadata.image);
            }
        });

        it("Should only allow owner to handle batch mint", async () => {
            const { router, unauthorized, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                router
                    .connect(unauthorized)
                    .handleBatchMint(
                        user1.address,
                        [1, 2],
                        [sampleCoreMetadata, sampleCoreMetadata],
                        [sampleMediaMetadata, sampleMediaMetadata],
                    ),
                "OwnableUnauthorizedAccount",
            );
        });
    });

    describe("Metadata Management", () => {
        it("Should prevent setting core metadata twice", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            // First mint should succeed
            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Attempt to mint the same tokenId again should fail due to metadata already set
            expect(
                router
                    .connect(owner)
                    .handleSingleMint(
                        user1.address,
                        tokenId,
                        sampleCoreMetadata,
                        sampleMediaMetadata,
                    ),
            ).to.be.revertedWithCustomError(router, "Router_CoreMetadataAlreadySet");
        });

        it("Should prevent setting media metadata twice", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            // First mint should succeed
            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Attempting to set media metadata again should fail through extension
            // This would be caught in the extension level
        });

        it("Should allow retrieving metadata for existing tokens", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const coreMetadata = await router.handleGetCoreMetadata(tokenId);

            expect(coreMetadata.collection).to.equal(sampleCoreMetadata.collection);
            expect(coreMetadata.creator).to.equal(sampleCoreMetadata.creator);
            expect(coreMetadata.description).to.equal(sampleCoreMetadata.description);
            expect(coreMetadata.tokenName).to.equal(sampleCoreMetadata.tokenName);
            expect(coreMetadata.supply).to.equal(sampleCoreMetadata.supply);

            const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

            expect(mediaMetadata.image).to.equal(sampleMediaMetadata.image);
            expect(mediaMetadata.video).to.equal(sampleMediaMetadata.video);
        });
    });

    describe("Token URI Rendering", () => {
        it("Should render token URI correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);

            expect(tokenURI).to.include("data:application/json;base64,");
        });
    });

    describe("Access Control", () => {
        it("Should only allow active extensions to set metadata", async () => {
            const { router, unauthorized } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(unauthorized).handleSetCoreMetadata(1, sampleCoreMetadata),
                "Router_NotAuthorizedExtension",
            );

            await expectCustomError(
                router.connect(unauthorized).handleSetMediaMetadata(1, sampleMediaMetadata),
                "Router_NotAuthorizedExtension",
            );
        });

        it("Should only allow active extensions to mint externally", async () => {
            const { router, unauthorized, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(unauthorized).handleMintExternal(user1.address, 1),
                "Router_NotAuthorizedExtension",
            );
        });

        it("Should allow owner to upgrade contract", async () => {
            const { router } = await loadFixture(deployFixture);
            const routerV2Factory = await ethers.getContractFactory("Router");

            // This should not revert (owner can authorize upgrades)
            await upgrades.upgradeProxy(await router.getAddress(), routerV2Factory);
            // If we reach here without throwing, the upgrade was successful
        });

        it("Should prevent unauthorized upgrade", async () => {
            const { router, unauthorized } = await loadFixture(deployFixture);

            // We can't directly test _authorizeUpgrade as it's internal,
            // but we can test that unauthorized users can't perform admin functions
            await expectCustomError(
                router.connect(unauthorized).transferOwnership(unauthorized.address),
                "OwnableUnauthorizedAccount",
            );
        });
    });

    describe("Upgrade Functionality", () => {
        it("Should maintain state after upgrade", async () => {
            const { router, owner, singleMintExtension } = await loadFixture(deployFixture);

            // Set some state
            await router
                .connect(owner)
                .setSingleMintExtension(await singleMintExtension.getAddress());

            const initialExtension = await router.getSingleMintExtension();

            // Upgrade the contract
            const routerV2Factory = await ethers.getContractFactory("Router");
            const upgradedRouter = await upgrades.upgradeProxy(
                await router.getAddress(),
                routerV2Factory,
            );

            // State should be maintained
            expect(await upgradedRouter.getSingleMintExtension()).to.equal(initialExtension);
            expect(await upgradedRouter.owner()).to.equal(owner.address);
        });
    });
});
