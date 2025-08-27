// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

interface IRouterForMetadataRendererExtension {
    function handleGetCoreMetadata(
        uint256 tokenId
    ) external view returns (CoreMetadata.Metadata memory);

    function handleGetMediaMetadata(
        uint256 tokenId
    ) external view returns (MediaMetadata.Metadata memory);
}
