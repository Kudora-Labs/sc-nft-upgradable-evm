// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { MediaMetadata } from "../types/MediaMetadata.sol";

error MediaMetadataLib_ImageTooLong();
error MediaMetadataLib_VideoTooLong();

library MediaMetadataLib {
    bytes32 internal constant STORAGE_SLOT = keccak256("nft.media.metadata");

    struct Layout {
        mapping(uint256 => MediaMetadata.Metadata) _mediaData;
    }

    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }

    function set(uint256 tokenId, MediaMetadata.Metadata memory metadata) internal {
        validate(metadata);
        layout()._mediaData[tokenId] = metadata;
    }

    function get(uint256 tokenId) internal view returns (MediaMetadata.Metadata memory) {
        return layout()._mediaData[tokenId];
    }

    function validate(MediaMetadata.Metadata memory metadata) internal pure {
        if (bytes(metadata.image).length > 256) revert MediaMetadataLib_ImageTooLong();
        if (bytes(metadata.video).length > 256) revert MediaMetadataLib_VideoTooLong();
    }
}
