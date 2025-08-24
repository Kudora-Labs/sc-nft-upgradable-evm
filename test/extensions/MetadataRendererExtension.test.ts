 
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, sampleCoreMetadata, sampleMediaMetadata } from "../helpers/fixtures";
import { decodeBase64JSON, expectCustomError, validateTokenURI } from "../helpers/utils";

describe("MetadataRendererExtension", () => {
    describe("Token URI Rendering", () => {
        it("Should render valid base64 JSON token URI", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);

            expect(tokenURI).to.include("data:application/json;base64,");

            const decodedData = decodeBase64JSON(tokenURI);

            expect(decodedData).to.have.property("name");
            expect(decodedData).to.have.property("description");
            expect(decodedData).to.have.property("image");
            expect(decodedData).to.have.property("animation_url");
            expect(decodedData).to.have.property("attributes");
        });

        it("Should include correct metadata in token URI", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);

            validateTokenURI(tokenURI, {
                name: sampleCoreMetadata.tokenName,
                description: sampleCoreMetadata.description,
                image: sampleMediaMetadata.image,
                animation_url: sampleMediaMetadata.video,
                attributes: [
                    { trait_type: "Collection", value: sampleCoreMetadata.collection },
                    { trait_type: "Creator", value: sampleCoreMetadata.creator },
                    { trait_type: "Supply", value: sampleCoreMetadata.supply },
                ],
            });
        });

        it("Should handle special characters in metadata", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const specialMetadata = {
                collection: "Collection with \"quotes\" and 'apostrophes'",
                creator: "Creator & Co. <script>alert('xss')</script>",
                description: "Description with\nnewlines\tand\ttabs",
                tokenName: "Token with emoji: 🚀✨",
                supply: "1/1000",
            };

            const specialMediaMetadata = {
                image: "https://example.com/path with spaces/image.png?param=value&other=123",
                video: "https://example.com/video.mp4?param=\"value\"&other='test'",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, specialMetadata, specialMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            // Verify special characters are properly escaped/handled
            expect(decodedData.name).to.equal(specialMetadata.tokenName);
            expect(decodedData.description).to.equal(specialMetadata.description);
            expect(decodedData.image).to.equal(specialMediaMetadata.image);
            expect(decodedData.animation_url).to.equal(specialMediaMetadata.video);
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

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            expect(decodedData.name).to.equal("");
            expect(decodedData.description).to.equal("");
            expect(decodedData.image).to.equal("");
            expect(decodedData.animation_url).to.equal("");
        });

        it("Should reject metadata fields that are too long", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const longString = "A".repeat(1000);
            const longMetadata = {
                collection: longString,
                creator: longString,
                description: longString,
                tokenName: longString,
                supply: longString,
            };

            const longMediaMetadata = {
                image: `https://example.com/${longString}.png`,
                video: `https://example.com/${longString}.mp4`,
            };

            const tokenId = 1;

            await expectCustomError(
                router
                    .connect(owner)
                    .handleSingleMint(user1.address, tokenId, longMetadata, longMediaMetadata),
                "CoreMetadataLib_NameTooLong",
            );
        });
    });

    describe("Attributes Generation", () => {
        it("Should generate attributes array correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            expect(decodedData.attributes).to.be.an("array");
            expect(decodedData.attributes).to.have.length(3);

            const attributes = decodedData.attributes as { trait_type: string; value: string }[];

            expect(attributes[0]).to.deep.equal({
                trait_type: "Collection",
                value: sampleCoreMetadata.collection,
            });

            expect(attributes[1]).to.deep.equal({
                trait_type: "Creator",
                value: sampleCoreMetadata.creator,
            });

            expect(attributes[2]).to.deep.equal({
                trait_type: "Supply",
                value: sampleCoreMetadata.supply,
            });
        });

        it("Should handle empty attributes values", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const emptyMetadata = {
                collection: "",
                creator: "",
                description: "Some description",
                tokenName: "Some token",
                supply: "",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, emptyMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            const attributes = decodedData.attributes as { trait_type: string; value: string }[];

            expect(attributes[0].value).to.equal("");
            expect(attributes[1].value).to.equal("");
            expect(attributes[2].value).to.equal("");
        });
    });

    describe("JSON Structure Validation", () => {
        it("Should produce valid JSON structure", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);

            const base64Part = tokenURI.replace("data:application/json;base64,", "");
            const jsonString = Buffer.from(base64Part, "base64").toString("utf8");

            // Should be valid JSON
            expect(() => JSON.parse(jsonString)).to.not.throw();
        });

        it("Should have all required OpenSea fields", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            /**
             * OpenSea metadata standards require:
             * - name: string
             * - description: string
             * - image: string (URL)
             * - attributes: array (optional but recommended)
             * - animation_url: string (optional).
             */
            expect(decodedData).to.have.property("name");
            expect(decodedData).to.have.property("description");
            expect(decodedData).to.have.property("image");
            expect(decodedData).to.have.property("attributes");
            expect(decodedData).to.have.property("animation_url");

            expect(typeof decodedData.name).to.equal("string");
            expect(typeof decodedData.description).to.equal("string");
            expect(typeof decodedData.image).to.equal("string");
            expect(Array.isArray(decodedData.attributes)).to.equal(true);
            expect(typeof decodedData.animation_url).to.equal("string");
        });
    });

    describe("Integration with Router", () => {
        it("Should work correctly when called through router", async () => {
            const { router, nftCore, owner, user1 } = await loadFixture(deployFixture);

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, sampleCoreMetadata, sampleMediaMetadata);

            // Call through router
            const routerTokenURI = await router.handleRenderTokenURI(tokenId);

            // Call through NFTCore (which delegates to router)
            const nftCoreTokenURI = await nftCore.tokenURI(tokenId);

            expect(routerTokenURI).to.equal(nftCoreTokenURI);
        });

        it("Should render different URIs for different tokens", async () => {
            const { router, owner, user1, user2 } = await loadFixture(deployFixture);

            const metadata1 = { ...sampleCoreMetadata, tokenName: "Token 1" };
            const metadata2 = { ...sampleCoreMetadata, tokenName: "Token 2" };

            await router
                .connect(owner)
                .handleSingleMint(user1.address, 1, metadata1, sampleMediaMetadata);
            await router
                .connect(owner)
                .handleSingleMint(user2.address, 2, metadata2, sampleMediaMetadata);

            const tokenURI1 = await router.handleRenderTokenURI(1);
            const tokenURI2 = await router.handleRenderTokenURI(2);

            expect(tokenURI1).to.not.equal(tokenURI2);

            const decoded1 = decodeBase64JSON(tokenURI1);
            const decoded2 = decodeBase64JSON(tokenURI2);

            expect(decoded1.name).to.equal("Token 1");
            expect(decoded2.name).to.equal("Token 2");
        });
    });

    describe("Edge Cases", () => {
        it("Should handle Unicode characters correctly", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const unicodeMetadata = {
                collection: "🎨 Art Collection",
                creator: "👨‍🎨 Artist",
                description: "A beautiful piece with émojis and special cháracters: ñoño",
                tokenName: "Token № 1️⃣",
                supply: "∞",
            };

            const tokenId = 1;

            await router
                .connect(owner)
                .handleSingleMint(user1.address, tokenId, unicodeMetadata, sampleMediaMetadata);

            const tokenURI = await router.handleRenderTokenURI(tokenId);
            const decodedData = decodeBase64JSON(tokenURI);

            expect(decodedData.name).to.equal(unicodeMetadata.tokenName);
            expect(decodedData.description).to.equal(unicodeMetadata.description);
        });

        it("Should handle very large token IDs", async () => {
            const { router, owner, user1 } = await loadFixture(deployFixture);

            const largeTokenId = BigInt("999999999999999999");

            await router
                .connect(owner)
                .handleSingleMint(
                    user1.address,
                    largeTokenId,
                    sampleCoreMetadata,
                    sampleMediaMetadata,
                );

            const tokenURI = await router.handleRenderTokenURI(largeTokenId);

            expect(tokenURI).to.include("data:application/json;base64,");

            const decodedData = decodeBase64JSON(tokenURI);

            expect(decodedData.name).to.equal(sampleCoreMetadata.tokenName);
        });
    });
});
