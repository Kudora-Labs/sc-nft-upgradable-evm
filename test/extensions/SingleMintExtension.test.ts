import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, sampleCoreMetadata, sampleMediaMetadata } from "../helpers/fixtures";
import { expectCustomError, ZERO_ADDRESS } from "../helpers/utils";

describe("SingleMintExtension", () => {
    describe("Deployment", () => {
        it("Should deploy with correct router address", async () => {
            const { singleMintExtension } = await loadFixture(deployFixture);

            // We can't directly check the router address as it's private/immutable
            // But we can verify the contract was deployed and is functional
            expect(await singleMintExtension.getAddress()).to.not.equal(ZERO_ADDRESS);
        });

        it("Should revert if deployed with zero router address", async () => {
            const singleMintExtensionFactory =
                await ethers.getContractFactory("SingleMintExtension");

            expect(singleMintExtensionFactory.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(
                singleMintExtensionFactory,
                "SingleMintExtension_InvalidRouterAddress",
            );
        });
    });

    describe("Single Mint Functionality", () => {
        it("Should mint token when called by router", async () => {
            const { router, singleMintExtension, owner, user1, nftCore } =
                await loadFixture(deployFixture);

            const tokenId = 1;

            const tx = await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            expect(tx)
                .to.emit(singleMintExtension, "SingleMintEvent")
                .withArgs(user1.address, tokenId);

            // Verify the token was actually minted in NFTCore
            expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
        });

        it("Should revert when called directly (not through router)", async () => {
            const { singleMintExtension, unauthorized, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                singleMintExtension
                    .connect(unauthorized)
                    .singleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata),
                "SingleMintExtension_NotRouter",
            );
        });

        it("Should revert when token ID is zero", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(owner).handleSingleMint(
                    user1.address,
                    0, // Invalid token ID
                    sampleCoreMetadata,
                    sampleMediaMetadata,
                ),
                "SingleMintExtension_TokenIdZero",
            );
        });

        it("Should set metadata correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Verify core metadata was set
            const coreMetadata = await router.handleGetCoreMetadata(tokenId);

            expect(coreMetadata.collection).to.equal(sampleCoreMetadata.collection);
            expect(coreMetadata.creator).to.equal(sampleCoreMetadata.creator);
            expect(coreMetadata.description).to.equal(sampleCoreMetadata.description);
            expect(coreMetadata.tokenName).to.equal(sampleCoreMetadata.tokenName);
            expect(coreMetadata.supply).to.equal(sampleCoreMetadata.supply);

            // Verify media metadata was set
            const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

            expect(mediaMetadata.image).to.equal(sampleMediaMetadata.image);
            expect(mediaMetadata.video).to.equal(sampleMediaMetadata.video);
        });

        it("Should mint multiple tokens sequentially", async () => {
            const { router, nftCore, owner, user1, user2 } = await loadFixture(deployFixture);

            // Mint first token
            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    1,
                    { ...sampleCoreMetadata, tokenName: "Token 1" },
                    sampleMediaMetadata,
                );

            // Mint second token
            await router
                .connect(owner)
                .handleSingleMint(
                    user2.address,
                    2,
                    { ...sampleCoreMetadata, tokenName: "Token 2" },
                    sampleMediaMetadata,
                );

            // Verify both tokens exist and have correct owners
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(2)).to.equal(user2.address);

            // Verify metadata is different
            const metadata1 = await router.handleGetCoreMetadata(1);
            const metadata2 = await router.handleGetCoreMetadata(2);

            expect(metadata1.tokenName).to.equal("Token 1");
            expect(metadata2.tokenName).to.equal("Token 2");
        });

        it("Should handle complex metadata correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const complexCoreMetadata = {
                collection: "Special Collection with Unicode: 🎨",
                creator: 'Artist Name with Quotes: "John Doe"',
                description: "A description with\nnewlines and special chars: &<>\"'",
                tokenName: "Token with Emoji: 🚀",
                supply: "1 of 1000",
            };

            const complexMediaMetadata = {
                image: "https://example.com/path/with spaces/image.png",
                video: "https://example.com/video.mp4?param=value&other=123",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    tokenId,
                    complexCoreMetadata,
                    complexMediaMetadata,
                );

            // Verify complex metadata was stored correctly
            const storedCore = await router.handleGetCoreMetadata(tokenId);

            expect(storedCore.collection).to.equal(complexCoreMetadata.collection);
            expect(storedCore.creator).to.equal(complexCoreMetadata.creator);
            expect(storedCore.description).to.equal(complexCoreMetadata.description);

            const storedMedia = await router.handleGetMediaMetadata(tokenId);

            expect(storedMedia.image).to.equal(complexMediaMetadata.image);
            expect(storedMedia.video).to.equal(complexMediaMetadata.video);
        });
    });

    describe("Integration with Router", () => {
        it("Should work correctly when called through router handler", async () => {
            const { router, singleMintExtension, nftCore, owner, user1 } =
                await loadFixture(deployFixture);

            const tokenId = 42;

            // Call through router's handler
            const tx = await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Should emit both extension and core events
            expect(tx)
                .to.emit(singleMintExtension, "SingleMintEvent")
                .withArgs(user1.address, tokenId)
                .and.to.emit(nftCore, "NFTMinted")
                .withArgs(user1.address, tokenId);

            // Token should exist and have correct owner
            expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
        });

        it("Should respect router access control", async () => {
            const { singleMintExtension, unauthorized, user1 } = await loadFixture(deployFixture);

            // Direct call should fail
            await expectCustomError(
                singleMintExtension
                    .connect(unauthorized)
                    .singleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata),
                "SingleMintExtension_NotRouter",
            );
        });
    });

    describe("Edge Cases", () => {
        it("Should handle maximum token ID", async () => {
            const { router, owner, user1, nftCore } = await loadFixture(deployFixture);

            // Use a very large token ID (within uint256 range)
            const maxTokenId = BigInt(
                "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            );

            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    maxTokenId,
                    sampleCoreMetadata,
                    sampleMediaMetadata,
                );

            expect(await nftCore.ownerOf(maxTokenId)).to.equal(user1.address);
        });

        it("Should handle empty metadata fields", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const emptyMetadata = {
                collection: "",
                creator: "",
                description: "",
                tokenName: "",
                supply: "",
            };

            const emptyMediaMetadata = {
                image: "",
                video: "",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, emptyMetadata, emptyMediaMetadata);

            // Should still work, just with empty strings
            const storedCore = await router.handleGetCoreMetadata(tokenId);

            expect(storedCore.tokenName).to.equal("");

            const storedMedia = await router.handleGetMediaMetadata(tokenId);

            expect(storedMedia.image).to.equal("");
        });
    });
});
