// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ISingleMintExtension } from "../interfaces/ISingleMintExtension.sol";

import { IRouterForMintExtension } from "../interfaces/IRouterForMintExtension.sol";

import { AddressChecksLib } from "../libraries/AddressChecksLib.sol";

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

error SingleMintExtension_NotRouter();
error SingleMintExtension_TokenIdZero();

contract SingleMintExtension is ISingleMintExtension {
    using AddressChecksLib for address;

    IRouterForMintExtension private immutable router;

    event SingleMintEvent(address indexed to, uint256 indexed tokenId);

    constructor(address routerAddress) {
        router = IRouterForMintExtension(routerAddress.ensureNonZeroContract("router"));
    }

    modifier onlyRouter() {
        if (msg.sender != address(router)) revert SingleMintExtension_NotRouter();
        _;
    }

    function singleMint(
        address to,
        uint256 tokenId,
        CoreMetadata.Metadata memory coreMetadata,
        MediaMetadata.Metadata memory mediaMetadata
    ) external override onlyRouter {
        if (tokenId == 0) revert SingleMintExtension_TokenIdZero();

        router.handleSetCoreMetadata(tokenId, coreMetadata);
        router.handleSetMediaMetadata(tokenId, mediaMetadata);
        router.handleMintExternal(to, tokenId);

        emit SingleMintEvent(to, tokenId);
    }
}
