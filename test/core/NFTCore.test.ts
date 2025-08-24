import { expect } from "chai";
import { ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, sampleCoreMetadata, sampleMediaMetadata } from "../helpers/fixtures";
import { expectCustomError, ZERO_ADDRESS } from "../helpers/utils";

describe("NFTCore", () => {
    describe("Deployment", () => {
        it("Should deploy with correct initial values", async () => {
            const { nftCore, router, owner } = await loadFixture(deployFixture);

            expect(await nftCore.name()).to.equal("NFT Collection");
            expect(await nftCore.symbol()).to.equal("NFT");
            expect(await nftCore.owner()).to.equal(owner.address);
            expect(await nftCore.router()).to.equal(await router.getAddress());
        });

        it("Should revert if router address is zero", async () => {
            const { owner } = await loadFixture(deployFixture);
            const nftCoreFactory = await ethers.getContractFactory("NFTCore");

            await expectCustomError(
                nftCoreFactory.connect(owner).deploy(ZERO_ADDRESS),
                "InvalidRouterAddress",
            );
        });
    });

    describe("Minting", () => {
        it("Should mint token when called by router", async () => {
            const { nftCore, router, user1, owner } = await loadFixture(deployFixture);

            const tokenId = 1;

            // Execute the minting transaction
            const tx = await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Should emit NFTMinted event
            expect(tx)
                .to.emit(nftCore, "NFTMinted")
                .withArgs(user1.address, tokenId)
                .and.to.emit(nftCore, "Transfer")
                .withArgs(ZeroAddress, user1.address, tokenId);

            // Verify ownership
            expect(await nftCore.ownerOf(tokenId)).to.equal(user1.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(1);
        });

        it("Should revert when mint called directly (not through router)", async () => {
            const { nftCore, user1, unauthorized } = await loadFixture(deployFixture);

            expect(
                nftCore.connect(unauthorized).mintToken(user1.address, 1),
            ).to.be.revertedWithCustomError(nftCore, "UnauthorizedRouterAccess");
        });

        it("Should revert when minting to zero address", async () => {
            const { router, owner } = await loadFixture(deployFixture);

            await expectCustomError(
                router
                    .connect(owner)
                    .handleSingleMint(ZERO_ADDRESS, 1, sampleCoreMetadata, sampleMediaMetadata),
                "InvalidRecipientAddress",
            );
        });

        it("Should revert when minting with tokenId zero", async () => {
            const { router, owner, user1, nftCore } = await loadFixture(deployFixture);

            expect(
                router
                    .connect(owner)
                    .handleSingleMint(user1.address, 0, sampleCoreMetadata, sampleMediaMetadata),
            ).to.be.revertedWithCustomError(nftCore, "InvalidTokenId");
        });

        it("Should allow minting multiple tokens", async () => {
            const { nftCore, router, owner, user1, user2 } = await loadFixture(deployFixture);

            // Mint first token to user1
            await router
                .connect(owner)
                .handleSingleMint(user1.address, 1, sampleCoreMetadata, sampleMediaMetadata);

            // Mint second token to user2
            await router
                .connect(owner)
                .handleSingleMint(user2.address, 2, sampleCoreMetadata, sampleMediaMetadata);

            expect(await nftCore.ownerOf(1)).to.equal(user1.address);
            expect(await nftCore.ownerOf(2)).to.equal(user2.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(1);
            expect(await nftCore.balanceOf(user2.address)).to.equal(1);
        });
    });

    describe("Token URI", () => {
        it("Should return correct tokenURI for existing token", async () => {
            const { nftCore, router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await nftCore.tokenURI(tokenId);

            expect(tokenURI).to.include("data:application/json;base64,");
        });

        it("Should revert for non-existent token", async () => {
            const { nftCore } = await loadFixture(deployFixture);

            await expectCustomError(nftCore.tokenURI(999), "TokenDoesNotExist");
        });

        it("Should delegate tokenURI rendering to router", async () => {
            const { nftCore, router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const nftTokenURI = await nftCore.tokenURI(tokenId);
            const routerTokenURI = await router.handleRenderTokenURI(tokenId);

            expect(nftTokenURI).to.equal(routerTokenURI);
        });
    });

    describe("Access Control", () => {
        it("Should only allow router to mint", async () => {
            const { nftCore, user1, unauthorized } = await loadFixture(deployFixture);

            await expectCustomError(
                nftCore.connect(unauthorized).mintToken(user1.address, 1),
                "UnauthorizedRouterAccess",
            );
        });

        it("Should maintain owner access control from OpenZeppelin", async () => {
            const { nftCore, owner, unauthorized } = await loadFixture(deployFixture);

            expect(await nftCore.owner()).to.equal(owner.address);

            // Test that ownership functions still work
            const txPromise = nftCore.connect(unauthorized).renounceOwnership();

            expect(txPromise).to.be.revertedWithCustomError(nftCore, "OwnableUnauthorizedAccount");
        });
    });

    describe("ERC721 Standard Compliance", () => {
        it("Should support ERC721 interface", async () => {
            const { nftCore } = await loadFixture(deployFixture);

            // ERC721 interface ID: 0x80ac58cd
            expect(await nftCore.supportsInterface("0x80ac58cd")).to.equal(true);

            // ERC165 interface ID: 0x01ffc9a7
            expect(await nftCore.supportsInterface("0x01ffc9a7")).to.equal(true);
        });

        it("Should handle transfers correctly", async () => {
            const { nftCore, router, owner, user1, user2 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Transfer from user1 to user2
            await nftCore.connect(user1).transferFrom(user1.address, user2.address, tokenId);

            expect(await nftCore.ownerOf(tokenId)).to.equal(user2.address);
            expect(await nftCore.balanceOf(user1.address)).to.equal(0);
            expect(await nftCore.balanceOf(user2.address)).to.equal(1);
        });

        it("Should handle approvals correctly", async () => {
            const { nftCore, router, owner, user1, user2 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Approve user2 to transfer token
            await nftCore.connect(user1).approve(user2.address, tokenId);
            expect(await nftCore.getApproved(tokenId)).to.equal(user2.address);

            // Transfer using approval
            await nftCore.connect(user2).transferFrom(user1.address, user2.address, tokenId);
            expect(await nftCore.ownerOf(tokenId)).to.equal(user2.address);
        });
    });
});
