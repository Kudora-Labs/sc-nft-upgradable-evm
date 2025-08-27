// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

interface IRouterForMintExtension {
    function handleMintExternal(address to, uint256 tokenId) external;
    function handleSetCoreMetadata(uint256 tokenId, CoreMetadata.Metadata memory core) external;
    function handleSetMediaMetadata(uint256 tokenId, MediaMetadata.Metadata memory media) external;
}
