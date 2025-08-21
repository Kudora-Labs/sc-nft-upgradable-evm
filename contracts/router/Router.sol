// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IBatchMintExtension } from "../interfaces/IBatchMintExtension.sol";
import { IMetadataRendererExtension } from "../interfaces/IMetadataRendererExtension.sol";
import { ISingleMintExtension } from "../interfaces/ISingleMintExtension.sol";

import { CoreMetadataLib } from "../libraries/CoreMetadataLib.sol";
import { MediaMetadataLib } from "../libraries/MediaMetadataLib.sol";

import { NFTCore } from "../core/NFTCore.sol";

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

error Router_CoreMetadataAlreadySet(uint256 tokenId);
error Router_MediaMetadataAlreadySet(uint256 tokenId);
error Router_NotAuthorizedExtension(address caller);
error Router_ZeroAddress(string field);

contract Router is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    event BatchMintExtensionUpdated(address indexed newExtension);
    event CoreMetadataStorageUpdated(address indexed newStorage);
    event MediaMetadataStorageUpdated(address indexed newStorage);
    event MetadataRendererUpdated(address indexed newRenderer);
    event SingleMintExtensionUpdated(address indexed newExtension);

    address private nftCore;
    IMetadataRendererExtension public metadataRendererExtension;
    ISingleMintExtension public singleMintExtension;
    IBatchMintExtension public batchMintExtension;

    using CoreMetadataLib for uint256;
    using MediaMetadataLib for uint256;

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
    function handleRenderTokenURI(uint256 tokenId) external view returns (string memory uri) {
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
    ) external view returns (CoreMetadata.Metadata memory) {
        return CoreMetadataLib.get(tokenId);
    }

    function handleSetCoreMetadata(
        uint256 tokenId,
        CoreMetadata.Metadata memory coreMetadata
    ) external onlyActiveExtension {
        CoreMetadata.Metadata memory existing = CoreMetadataLib.get(tokenId);

        if (bytes(existing.tokenName).length > 0) {
            revert Router_CoreMetadataAlreadySet(tokenId);
        }

        CoreMetadataLib.set(tokenId, coreMetadata);
    }

    // MediaMetadataLib
    function handleGetMediaMetadata(
        uint256 tokenId
    ) external view returns (MediaMetadata.Metadata memory) {
        return MediaMetadataLib.get(tokenId);
    }

    function handleSetMediaMetadata(
        uint256 tokenId,
        MediaMetadata.Metadata memory media
    ) external onlyActiveExtension {
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

    function handleMintExternal(address to, uint256 tokenId) external onlyActiveExtension {
        handleMint(to, tokenId);
    }

    // === SETTERS ADMIN ===
    function setBatchMintExtension(address newBatchMintExtension) external onlyOwner {
        if (newBatchMintExtension == address(0)) revert Router_ZeroAddress("newBatchMintExtension");
        batchMintExtension = IBatchMintExtension(newBatchMintExtension);
        emit BatchMintExtensionUpdated(newBatchMintExtension);
    }

    function setMetadataRendererExtension(address newRendererExtension) external onlyOwner {
        if (newRendererExtension == address(0)) revert Router_ZeroAddress("newRendererExtension");
        metadataRendererExtension = IMetadataRendererExtension(newRendererExtension);
        emit MetadataRendererUpdated(newRendererExtension);
    }

    function setNFTCore(address newNFTCore) external onlyOwner {
        if (newNFTCore == address(0)) revert Router_ZeroAddress("newNFTCore");
        nftCore = newNFTCore;
    }

    function setSingleMintExtension(address newSingleMintExtension) external onlyOwner {
        if (newSingleMintExtension == address(0))
            revert Router_ZeroAddress("newSingleMintExtension");
        singleMintExtension = ISingleMintExtension(newSingleMintExtension);
        emit SingleMintExtensionUpdated(newSingleMintExtension);
    }
}
