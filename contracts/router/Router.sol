// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IRouterForMetadataRendererExtension } from "../interfaces/IRouterForMetadataRendererExtension.sol";
import { IRouterForMintExtension } from "../interfaces/IRouterForMintExtension.sol";
import { IRouterForNFTCore } from "../interfaces/IRouterForNFTCore.sol";

import { IBatchMintExtension } from "../interfaces/IBatchMintExtension.sol";
import { IMetadataRendererExtension } from "../interfaces/IMetadataRendererExtension.sol";
import { ISingleMintExtension } from "../interfaces/ISingleMintExtension.sol";

import { AddressChecksLib } from "../libraries/AddressChecksLib.sol";
import { CoreMetadataLib } from "../libraries/CoreMetadataLib.sol";
import { MediaMetadataLib } from "../libraries/MediaMetadataLib.sol";

import { NFTCore } from "../core/NFTCore.sol";

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

error Router_CoreMetadataAlreadySet(uint256 tokenId);
error Router_MediaMetadataAlreadySet(uint256 tokenId);
error Router_NotAuthorizedExtension(address caller);

contract Router is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IRouterForMetadataRendererExtension,
    IRouterForMintExtension,
    IRouterForNFTCore
{
    using AddressChecksLib for address;
    using CoreMetadataLib for uint256;
    using MediaMetadataLib for uint256;

    address private nftCore;

    IMetadataRendererExtension public metadataRendererExtension;
    ISingleMintExtension public singleMintExtension;
    IBatchMintExtension public batchMintExtension;

    event BatchMintExtensionUpdated(address indexed newExtension);
    event CoreMetadataStorageUpdated(address indexed newStorage);
    event MediaMetadataStorageUpdated(address indexed newStorage);
    event MetadataRendererUpdated(address indexed newRenderer);
    event SingleMintExtensionUpdated(address indexed newExtension);

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // === ACCESS CONTROL ===
    modifier onlyActiveExtension() {
        if (
            msg.sender != address(batchMintExtension) && msg.sender != address(singleMintExtension)
        ) {
            revert Router_NotAuthorizedExtension(msg.sender);
        }
        _;
    }

    // === GETTERS ===
    function getBatchMintExtension() external view returns (address) {
        return address(batchMintExtension);
    }

    function getMetadataRendererExtension() external view returns (address) {
        return address(metadataRendererExtension);
    }

    function getNFTCore() external view returns (address) {
        return address(nftCore);
    }

    function getSingleMintExtension() external view returns (address) {
        return address(singleMintExtension);
    }

    // === DELEGATED EXTENSIONS HANDLERS ===
    // BatchMintExtension
    function handleBatchMint(
        address to,
        uint256[] calldata tokenIds,
        CoreMetadata.Metadata[] calldata coreMetadatas,
        MediaMetadata.Metadata[] calldata mediaMetadatas
    ) external onlyOwner {
        batchMintExtension.batchMint(to, tokenIds, coreMetadatas, mediaMetadatas);
    }

    // MetadataRendererExtension
    function handleRenderTokenURI(
        uint256 tokenId
    ) external view override(IRouterForNFTCore) returns (string memory uri) {
        return metadataRendererExtension.renderTokenURI(tokenId);
    }

    // SingleMintExtension
    function handleSingleMint(
        address to,
        uint256 tokenId,
        CoreMetadata.Metadata memory coreMetadata,
        MediaMetadata.Metadata memory mediaMetadata
    ) external onlyOwner {
        singleMintExtension.singleMint(to, tokenId, coreMetadata, mediaMetadata);
    }

    // === DELEGATED LIBRAIRIES HANDLERS ===
    // CoreMetadataLib
    function handleGetCoreMetadata(
        uint256 tokenId
    )
        external
        view
        override(IRouterForMetadataRendererExtension)
        returns (CoreMetadata.Metadata memory)
    {
        return CoreMetadataLib.get(tokenId);
    }

    function handleSetCoreMetadata(
        uint256 tokenId,
        CoreMetadata.Metadata memory coreMetadata
    ) external override(IRouterForMintExtension) onlyActiveExtension {
        CoreMetadata.Metadata memory existing = CoreMetadataLib.get(tokenId);

        if (bytes(existing.tokenName).length > 0) {
            revert Router_CoreMetadataAlreadySet(tokenId);
        }

        CoreMetadataLib.set(tokenId, coreMetadata);
    }

    // MediaMetadataLib
    function handleGetMediaMetadata(
        uint256 tokenId
    )
        external
        view
        override(IRouterForMetadataRendererExtension)
        returns (MediaMetadata.Metadata memory)
    {
        return MediaMetadataLib.get(tokenId);
    }

    function handleSetMediaMetadata(
        uint256 tokenId,
        MediaMetadata.Metadata memory media
    ) external override(IRouterForMintExtension) onlyActiveExtension {
        MediaMetadata.Metadata memory existing = MediaMetadataLib.get(tokenId);

        if (bytes(existing.image).length > 0) {
            revert Router_MediaMetadataAlreadySet(tokenId);
        }

        MediaMetadataLib.set(tokenId, media);
    }

    // === NFTCore ===
    function handleMint(address to, uint256 tokenId) internal {
        NFTCore nft = NFTCore(nftCore);
        nft.mintToken(to, tokenId);
    }

    function handleMintExternal(
        address to,
        uint256 tokenId
    ) external override(IRouterForMintExtension) onlyActiveExtension {
        handleMint(to, tokenId);
    }

    // === SETTERS ADMIN ===
    function setBatchMintExtension(address newBatchMintExtension) external onlyOwner {
        batchMintExtension = IBatchMintExtension(
            newBatchMintExtension.ensureNonZeroContract("newBatchMintExtension")
        );
        emit BatchMintExtensionUpdated(address(batchMintExtension));
    }

    function setMetadataRendererExtension(address newRendererExtension) external onlyOwner {
        metadataRendererExtension = IMetadataRendererExtension(
            newRendererExtension.ensureNonZeroContract("newRendererExtension")
        );
        emit MetadataRendererUpdated(address(metadataRendererExtension));
    }

    function setNFTCore(address newNFTCore) external onlyOwner {
        nftCore = newNFTCore.ensureNonZeroContract("newNFTCore");
    }

    function setSingleMintExtension(address newSingleMintExtension) external onlyOwner {
        singleMintExtension = ISingleMintExtension(
            newSingleMintExtension.ensureNonZeroContract("newSingleMintExtension")
        );
        emit SingleMintExtensionUpdated(address(singleMintExtension));
    }
}
