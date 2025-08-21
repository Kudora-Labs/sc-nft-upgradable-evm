// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

interface IBatchMintExtension {
    function batchMint(
        address to,
        uint256[] calldata tokenIds,
        CoreMetadata.Metadata[] calldata coreMetadatas,
        MediaMetadata.Metadata[] calldata mediaMetadatas
    ) external;
}
