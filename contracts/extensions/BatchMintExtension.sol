// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBatchMintExtension } from "../interfaces/IBatchMintExtension.sol";

import { IRouterForMintExtension } from "../interfaces/IRouterForMintExtension.sol";

import { AddressChecksLib } from "../libraries/AddressChecksLib.sol";

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

error BatchMintExtension_InvalidArrayLength();
error BatchMintExtension_MismatchedMetadataLength();
error BatchMintExtension_NotRouter();
error BatchMintExtension_TokenIdZero();

contract BatchMintExtension is IBatchMintExtension {
    using AddressChecksLib for address;

    IRouterForMintExtension private immutable router;

    constructor(address routerAddress) {
        router = IRouterForMintExtension(routerAddress.ensureNonZeroContract("routerAddress"));
    }

    modifier onlyRouter() {
        if (msg.sender != address(router)) revert BatchMintExtension_NotRouter();
        _;
    }

    function batchMint(
        address to,
        uint256[] memory tokenIds,
        CoreMetadata.Metadata[] memory coreMetadatas,
        MediaMetadata.Metadata[] memory mediaMetadatas
    ) external override onlyRouter {
        uint256 length = tokenIds.length;

        if (length == 0) revert BatchMintExtension_InvalidArrayLength();
        if (coreMetadatas.length != length || mediaMetadatas.length != length) {
            revert BatchMintExtension_MismatchedMetadataLength();
        }

        for (uint256 i = 0; i < length; i++) {
            if (tokenIds[i] == 0) revert BatchMintExtension_TokenIdZero();

            router.handleSetCoreMetadata(tokenIds[i], coreMetadatas[i]);
            router.handleSetMediaMetadata(tokenIds[i], mediaMetadatas[i]);
            router.handleMintExternal(to, tokenIds[i]);
        }
    }
}
