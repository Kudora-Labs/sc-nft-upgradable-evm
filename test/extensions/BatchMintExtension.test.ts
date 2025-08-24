import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
    deployFixture,
    sampleCoreMetadata,
    sampleCoreMetadata2,
    sampleMediaMetadata,
    sampleMediaMetadata2,
} from "../helpers/fixtures";
import { expectCustomError, generateTokenIds, ZERO_ADDRESS } from "../helpers/utils";

describe("BatchMintExtension", () => {
    describe("Deployment", () => {
        it("Should deploy with correct router address", async () => {
            const { batchMintExtension } = await loadFixture(deployFixture);

            expect(await batchMintExtension.getAddress()).to.not.equal(ZERO_ADDRESS);
        });

        it("Should revert if deployed with zero router address", async () => {
            const batchMintExtensionFactory = await ethers.getContractFactory("BatchMintExtension");

            expect(batchMintExtensionFactory.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(
                batchMintExtensionFactory,
                "BatchMintExtension_InvalidRouterAddress",
            );
        });
    });

    describe("Batch Mint Functionality", () => {
        it("Should mint multiple tokens in batch", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = generateTokenIds(3);
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata, sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata, sampleMediaMetadata];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify all tokens were minted to the correct user
            for (const tokenId of tokenIds) {
                expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
            }

            // Verify user balance
            expect(await nftCore.balanceOf(user1.address)).to.equal(tokenIds.length);
        });

        it("Should set metadata correctly for all tokens", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2];
            const coreMetadatas = [
                { ...sampleCoreMetadata, tokenName: "Token 1" },
                { ...sampleCoreMetadata, tokenName: "Token 2" },
            ];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata2];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify metadata for each token
            const metadata1 = await router.handleGetCoreMetadata(1);
            const media1 = await router.handleGetMediaMetadata(1);

            expect(metadata1.tokenName).to.equal("Token 1");
            expect(media1.image).to.equal(sampleMediaMetadata.image);

            const metadata2 = await router.handleGetCoreMetadata(2);
            const media2 = await router.handleGetMediaMetadata(2);

            expect(metadata2.tokenName).to.equal("Token 2");
            expect(media2.image).to.equal(sampleMediaMetadata2.image);
        });

        it("Should revert when called directly (not through router)", async () => {
            const { batchMintExtension, unauthorized, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2];
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata];

            await expectCustomError(
                batchMintExtension
                    .connect(unauthorized)
                    .batchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas),
                "BatchMintExtension_NotRouter",
            );
        });

        it("Should revert with empty token IDs array", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                router.connect(owner).handleBatchMint(
                    user1.address,
                    [], // Empty array
                    [],
                    [],
                ),
                "BatchMintExtension_InvalidArrayLength",
            );
        });

        it("Should revert with mismatched array lengths", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2, 3];
            /**
             * Wrong length.
             */
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata, sampleMediaMetadata];

            await expectCustomError(
                router
                    .connect(owner)
                    .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas),
                "BatchMintExtension_MismatchedMetadataLength",
            );
        });

        it("Should revert with zero token ID in batch", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            /**
             * Contains zero.
             */
            const tokenIds = [1, 0, 3];
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata, sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata, sampleMediaMetadata];

            await expectCustomError(
                router
                    .connect(owner)
                    .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas),
                "BatchMintExtension_TokenIdZero",
            );
        });

        it("Should handle large batch sizes", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const batchSize = 10;
            const tokenIds = generateTokenIds(batchSize);
            const coreMetadatas = Array(batchSize).fill(sampleCoreMetadata);
            const mediaMetadatas = Array(batchSize).fill(sampleMediaMetadata);

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify all tokens were minted
            expect(await nftCore.balanceOf(user1.address)).to.equal(batchSize);

            // Spot check a few tokens
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(5)).to.equal(user1.address);
            expect(await nftCore.ownerOf(10)).to.equal(user1.address);
        });

        it("Should handle batch with single token", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [42];
            const coreMetadatas = [sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            expect(await nftCore.ownerOf(42)).to.equal(user1.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(1);
        });
    });

    describe("Integration with Router", () => {
        it("Should work correctly when called through router handler", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2];
            const coreMetadatas = [sampleCoreMetadata, sampleCoreMetadata2];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata2];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify all tokens exist with correct metadata
            for (const [i, tokenId] of tokenIds.entries()) {
                expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);

                const coreMetadata = await router.handleGetCoreMetadata(tokenId);

                expect(coreMetadata.collection).to.equal(coreMetadatas[i].collection);

                const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

                expect(mediaMetadata.image).to.equal(mediaMetadatas[i].image);
            }
        });

        it("Should respect router access control", async () => {
            const { batchMintExtension, unauthorized, user1 } = await loadFixture(deployFixture);

            await expectCustomError(
                batchMintExtension
                    .connect(unauthorized)
                    .batchMint(user1.address, [1], [sampleCoreMetadata], [sampleMediaMetadata]),
                "BatchMintExtension_NotRouter",
            );
        });
    });

    describe("Complex Scenarios", () => {
        it("Should handle non-sequential token IDs", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            /**
             * Non-sequential.
             */
            const tokenIds = [5, 1, 100, 42];
            const coreMetadatas = Array(4).fill(sampleCoreMetadata);
            const mediaMetadatas = Array(4).fill(sampleMediaMetadata);

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify all tokens exist
            for (const tokenId of tokenIds) {
                expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
            }
        });

        it("Should handle different metadata for each token", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = [1, 2, 3];
            const coreMetadatas = [
                { ...sampleCoreMetadata, tokenName: "Unique Token 1", supply: "1" },
                { ...sampleCoreMetadata, tokenName: "Unique Token 2", supply: "2" },
                { ...sampleCoreMetadata, tokenName: "Unique Token 3", supply: "3" },
            ];
            const mediaMetadatas = [
                { ...sampleMediaMetadata, image: "https://example.com/1.png" },
                { ...sampleMediaMetadata, image: "https://example.com/2.png" },
                { ...sampleMediaMetadata, image: "https://example.com/3.png" },
            ];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify each token has unique metadata
            const expectedNames = ["Unique Token 1", "Unique Token 2", "Unique Token 3"];
            const expectedSupplies = ["1", "2", "3"];
            const expectedImages = [
                "https://example.com/1.png",
                "https://example.com/2.png",
                "https://example.com/3.png",
            ];

            for (const [index, tokenId] of tokenIds.entries()) {
                const idx = index;
                const coreMetadata = await router.handleGetCoreMetadata(tokenId);
                const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

                expect(coreMetadata.tokenName).to.equal(expectedNames[idx]);
                expect(coreMetadata.supply).to.equal(expectedSupplies[idx]);
                expect(mediaMetadata.image).to.equal(expectedImages[idx]);
            }
        });

        it("Should handle batch mint to different users", async () => {
            const { router, nftCore, owner, user1, user2 } = await loadFixture(deployFixture);

            // Mint batch to user1
            await router
                .connect(owner)
                .handleBatchMint(
                    user1.address,
                    [1, 2],
                    [sampleCoreMetadata, sampleCoreMetadata],
                    [sampleMediaMetadata, sampleMediaMetadata],
                );

            // Mint batch to user2
            await router
                .connect(owner)
                .handleBatchMint(
                    user2.address,
                    [3, 4],
                    [sampleCoreMetadata, sampleCoreMetadata],
                    [sampleMediaMetadata, sampleMediaMetadata],
                );

            // Verify ownership
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(2)).to.equal(user1.address);
            expect(await nftCore.ownerOf(3)).to.equal(user2.address);
            expect(await nftCore.ownerOf(4)).to.equal(user2.address);

            expect(await nftCore.balanceOf(user1.address)).to.equal(2);
            expect(await nftCore.balanceOf(user2.address)).to.equal(2);
        });
    });

    describe("Edge Cases", () => {
        it("Should handle maximum safe integer token IDs", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            /**
             * Number.MAX_SAFE_INTEGER.
             */
            const maxSafeInt = BigInt("9007199254740991");
            const tokenIds = [maxSafeInt];
            const coreMetadatas = [sampleCoreMetadata];
            const mediaMetadatas = [sampleMediaMetadata];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            expect(await nftCore.ownerOf(maxSafeInt)).to.equal(user1.address);
        });
    });
});
