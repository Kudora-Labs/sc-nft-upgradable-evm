// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CoreMetadata } from "../types/CoreMetadata.sol";

error CoreMetadataLib_CollectionTooLong();
error CoreMetadataLib_CreatorTooLong();
error CoreMetadataLib_DescriptionTooLong();
error CoreMetadataLib_NameTooLong();
error CoreMetadataLib_SupplyTooLong();

library CoreMetadataLib {
    bytes32 internal constant STORAGE_SLOT = keccak256("nft.core.metadata");

    struct Layout {
        mapping(uint256 => CoreMetadata.Metadata) _coreData;
    }

    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }

    function set(uint256 tokenId, CoreMetadata.Metadata memory metadata) internal {
        validate(metadata);
        layout()._coreData[tokenId] = metadata;
    }

    function get(uint256 tokenId) internal view returns (CoreMetadata.Metadata memory) {
        return layout()._coreData[tokenId];
    }

    function validate(CoreMetadata.Metadata memory metadata) internal pure {
        if (bytes(metadata.tokenName).length > 50) revert CoreMetadataLib_NameTooLong();
        if (bytes(metadata.collection).length > 50) revert CoreMetadataLib_CollectionTooLong();
        if (bytes(metadata.creator).length > 50) revert CoreMetadataLib_CreatorTooLong();
        if (bytes(metadata.description).length > 1024) revert CoreMetadataLib_DescriptionTooLong();
        if (bytes(metadata.supply).length > 16) revert CoreMetadataLib_SupplyTooLong();
    }
}
