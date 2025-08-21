// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

interface ISingleMintExtension {
    function singleMint(
        address to,
        uint256 tokenId,
        CoreMetadata.Metadata memory coreMetadata,
        MediaMetadata.Metadata memory mediaMetadata
    ) external;
}
