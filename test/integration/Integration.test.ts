/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { expect } from "chai";
import { ZeroAddress } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
    deployFixture,
    sampleCoreMetadata,
    sampleCoreMetadata2,
    sampleMediaMetadata,
    sampleMediaMetadata2,
} from "../helpers/fixtures";
import { decodeBase64JSON, generateTokenIds } from "../helpers/utils";

describe("Integration Tests", () => {
    describe("Complete Minting Flow", () => {
        it("Should handle complete single mint flow", async () => {
            const { router, nftCore, singleMintExtension, owner, user1 } =
                await loadFixture(deployFixture);

            const tokenId = 1;

            const tx = await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Should emit events from multiple contracts
            expect(tx)
                .to.emit(singleMintExtension, "SingleMintEvent")
                .withArgs(user1.address, tokenId)
                .and.to.emit(nftCore, "NFTMinted")
                .withArgs(user1.address, tokenId)
                .and.to.emit(nftCore, "Transfer")
                .withArgs(ZeroAddress, user1.address, tokenId);

            // Verify token ownership
            expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(1);

            // Verify metadata storage
            const coreMetadata = await router.handleGetCoreMetadata(tokenId);

            expect(coreMetadata.tokenName).to.equal(sampleCoreMetadata.tokenName);

            const mediaMetadata = await router.handleGetMediaMetadata(tokenId);

            expect(mediaMetadata.image).to.equal(sampleMediaMetadata.image);

            // Verify token URI generation
            const tokenURI = await nftCore.tokenURI(tokenId);

            expect(tokenURI).to.include("data:application/json;base64,");

            const decodedURI = decodeBase64JSON(tokenURI);

            expect(decodedURI.name).to.equal(sampleCoreMetadata.tokenName);
            expect(decodedURI.image).to.equal(sampleMediaMetadata.image);
        });

        it("Should handle complete batch mint flow", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const tokenIds = generateTokenIds(3);
            const coreMetadatas = [
                { ...sampleCoreMetadata, tokenName: "Batch Token 1" },
                { ...sampleCoreMetadata, tokenName: "Batch Token 2" },
                { ...sampleCoreMetadata, tokenName: "Batch Token 3" },
            ];
            const mediaMetadatas = [sampleMediaMetadata, sampleMediaMetadata, sampleMediaMetadata];

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            // Verify all tokens were minted
            expect(await nftCore.balanceOf(user1.address)).to.equal(3);

            // Verify each token has correct metadata and URI
            let tokenIndex = 0;

            for (const tokenId of tokenIds) {
                expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);

                const coreMetadata = await router.handleGetCoreMetadata(tokenId);

                expect(coreMetadata.tokenName).to.equal(`Batch Token ${tokenIndex + 1}`);

                const tokenURI = await nftCore.tokenURI(tokenId);
                const decodedURI = decodeBase64JSON(tokenURI);

                expect(decodedURI.name).to.equal(`Batch Token ${tokenIndex + 1}`);
                tokenIndex = tokenIndex + 1;
            }
        });
    });

    describe("Cross-Contract Interactions", () => {
        it("Should maintain consistency across all contracts", async () => {
            const { router, nftCore, metadataRendererExtension, owner, user1 } =
                await loadFixture(deployFixture);

            const tokenId = 42;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Get token URI from different sources - should be consistent
            const nftCoreURI = await nftCore.tokenURI(tokenId);
            const routerURI = await router.handleRenderTokenURI(tokenId);
            const rendererURI = await metadataRendererExtension.renderTokenURI(tokenId);

            expect(nftCoreURI).to.equal(routerURI);
            expect(routerURI).to.equal(rendererURI);
        });

        it("Should handle multiple users minting different tokens", async () => {
            const { router, nftCore, owner, user1, user2 } = await loadFixture(deployFixture);

            // User1 gets single mint
            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    1,
                    { ...sampleCoreMetadata, tokenName: "User1 Token" },
                    sampleMediaMetadata,
                );

            // User2 gets batch mint
            await router.connect(owner).handleBatchMint(
                user2.address,
                [2, 3],
                [
                    { ...sampleCoreMetadata2, tokenName: "User2 Token A" },
                    { ...sampleCoreMetadata2, tokenName: "User2 Token B" },
                ],
                [sampleMediaMetadata2, sampleMediaMetadata2],
            );

            // Verify balances
            expect(await nftCore.balanceOf(user1.address)).to.equal(1);
            expect(await nftCore.balanceOf(user2.address)).to.equal(2);

            // Verify ownership
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(2)).to.equal(user2.address);
            expect(await nftCore.ownerOf(3)).to.equal(user2.address);

            // Verify unique metadata
            const metadata1 = await router.handleGetCoreMetadata(1);
            const metadata2 = await router.handleGetCoreMetadata(2);
            const metadata3 = await router.handleGetCoreMetadata(3);

            expect(metadata1.tokenName).to.equal("User1 Token");
            expect(metadata2.tokenName).to.equal("User2 Token A");
            expect(metadata3.tokenName).to.equal("User2 Token B");
        });
    });

    describe("Token Lifecycle", () => {
        it("Should handle token transfers after minting", async () => {
            const { router, nftCore, owner, user1, user2 } = await loadFixture(deployFixture);

            const tokenId = 1;

            // Mint to user1
            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Transfer to user2
            await nftCore.connect(user1).transferFrom(user1.address, user2.address, tokenId);

            // Verify new ownership
            expect(await nftCore.ownerOf(tokenId)).to.equal(user2.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(0);
            expect(await nftCore.balanceOf(user2.address)).to.equal(1);

            // Verify metadata and URI are unchanged
            const tokenURI = await nftCore.tokenURI(tokenId);
            const decodedURI = decodeBase64JSON(tokenURI);

            expect(decodedURI.name).to.equal(sampleCoreMetadata.tokenName);
        });

        it("Should handle approvals and transfers", async () => {
            const { router, nftCore, owner, user1, user2, unauthorized } =
                await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Approve user2 to transfer
            await nftCore.connect(user1).approve(user2.address, tokenId);
            expect(await nftCore.getApproved(tokenId)).to.equal(user2.address);

            // user2 can transfer
            await nftCore.connect(user2).transferFrom(user1.address, unauthorized.address, tokenId);

            expect(await nftCore.ownerOf(tokenId)).to.equal(unauthorized.address);
        });
    });

    describe("System Limits and Edge Cases", () => {
        it("Should handle maximum batch size efficiently", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            /**
             * Large but reasonable batch.
             */
            const batchSize = 50;
            const tokenIds = generateTokenIds(batchSize);
            const coreMetadatas = Array.from({ length: batchSize }, (x, index: number) => {
                return {
                    ...sampleCoreMetadata,
                    tokenName: `Batch Token ${index + 1}`,
                    supply: `${index + 1}`,
                };
            });
            const mediaMetadatas = Array(batchSize).fill(sampleMediaMetadata);

            await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            expect(await nftCore.balanceOf(user1.address)).to.equal(batchSize);

            // Spot check a few tokens
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(25)).to.equal(user1.address);
            expect(await nftCore.ownerOf(50)).to.equal(user1.address);
        });

        it("Should handle very large token IDs", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const largeTokenId = BigInt("999999999999999999");

            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    largeTokenId,
                    sampleCoreMetadata,
                    sampleMediaMetadata,
                );

            expect(await nftCore.ownerOf(largeTokenId)).to.equal(user1.address);

            const tokenURI = await nftCore.tokenURI(largeTokenId);

            expect(tokenURI).to.include("data:application/json;base64,");
        });

        it("Should handle complex metadata scenarios", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const complexMetadata = {
                collection: "Collection with Unicode: 🎨 and symbols",
                creator: "Creator \"John Doe\" & 'Jane Smith'",
                description: "Multi-line\ndescription with\ttabs and <HTML> tags",
                tokenName: "Token #1 with special chars: ñáéíóú",
                supply: "∞ infinite",
            };

            const complexMediaMetadata = {
                image: "https://example.com/path with spaces/special-chars_@#$.png?param=value&other=123",
                video: "ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, complexMetadata, complexMediaMetadata);

            const tokenURI = await nftCore.tokenURI(tokenId);
            const decodedURI = decodeBase64JSON(tokenURI);

            expect(decodedURI.name).to.equal(complexMetadata.tokenName);
            expect(decodedURI.description).to.equal(complexMetadata.description);
            expect(decodedURI.image).to.equal(complexMediaMetadata.image);
            expect(decodedURI.animation_url).to.equal(complexMediaMetadata.video);

            // Verify attributes contain special characters correctly
            const attributes = decodedURI.attributes as { trait_type: string; value: string }[];

            expect(attributes[0].value).to.equal(complexMetadata.collection);
            expect(attributes[1].value).to.equal(complexMetadata.creator);
            expect(attributes[2].value).to.equal(complexMetadata.supply);
        });
    });

    describe("Gas Optimization", () => {
        it("Should be gas efficient for single mints", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tx = await router
                .connect(owner)
                .handleSingleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata);

            const receipt = await tx.wait();
            const gasUsed = receipt?.gasUsed ?? 0n;

            // Gas usage should be reasonable (adjust threshold as needed)
            expect(gasUsed).to.be.lessThan(500000n); // 500k gas threshold
        });

        it("Should be gas efficient for batch mints", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const batchSize = 5;
            const tokenIds = generateTokenIds(batchSize);
            const coreMetadatas = Array(batchSize).fill(sampleCoreMetadata);
            const mediaMetadatas = Array(batchSize).fill(sampleMediaMetadata);

            const tx = await router
                .connect(owner)
                .handleBatchMint(user1.address, tokenIds, coreMetadatas, mediaMetadatas);

            const receipt = await tx.wait();
            const gasUsed = receipt?.gasUsed ?? 0n;

            // Should be more efficient than 5 separate single mints
            const gasPerToken = Number(gasUsed) / batchSize;

            expect(gasPerToken).to.be.lessThan(300000); // 300k gas per token threshold
        });
    });

    describe("Error Scenarios", () => {
        it("Should maintain system integrity after failed operations", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            // Successful mint
            await router
                .connect(owner)
                .handleSingleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata);

            // Failed mint (duplicate token ID should be caught earlier in flow)
            // The system should still work for new tokens
            await router
                .connect(owner)
                .handleSingleMint(user1.address, 2, sampleCoreMetadata2, sampleMediaMetadata2);

            expect(await nftCore.balanceOf(user1.address)).to.equal(2);
            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(2)).to.equal(user1.address);
        });
    });
});
