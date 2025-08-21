// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";

import { IMetadataRendererExtension } from "../interfaces/IMetadataRendererExtension.sol";

import { Router } from "../router/Router.sol";

import { JSONEscapeLib } from "../libraries/JSONEscapeLib.sol";

import { CoreMetadata } from "../types/CoreMetadata.sol";
import { MediaMetadata } from "../types/MediaMetadata.sol";

contract MetadataRendererExtension is IMetadataRendererExtension {
    Router private immutable router;

    constructor(address routerAddress) {
        router = Router(routerAddress);
    }

    function renderTokenURI(uint256 tokenId) external view returns (string memory) {
        CoreMetadata.Metadata memory metadata = router.handleGetCoreMetadata(tokenId);
        MediaMetadata.Metadata memory media = router.handleGetMediaMetadata(tokenId);

        // prettier-ignore
        string memory attributes = string(
            abi.encodePacked(
                "[{\"trait_type\":\"Collection\",\"value\":\"",
                JSONEscapeLib.escapeJSON(metadata.collection),
                "\"},",
                "{\"trait_type\":\"Creator\",\"value\":\"",
                JSONEscapeLib.escapeJSON(metadata.creator),
                "\"},",
                "{\"trait_type\":\"Supply\",\"value\":\"",
                JSONEscapeLib.escapeJSON(metadata.supply),
                "\"}]"
            )
        );

        // prettier-ignore
        string memory json = string(
            abi.encodePacked(
                "{",
                "\"name\":\"",
                JSONEscapeLib.escapeJSON(metadata.tokenName),
                "\",",
                "\"description\":\"",
                JSONEscapeLib.escapeJSON(metadata.description),
                "\",",
                "\"image\":\"",
                JSONEscapeLib.escapeJSON(media.image),
                "\",",
                "\"animation_url\":\"",
                JSONEscapeLib.escapeJSON(media.video),
                "\",",
                "\"attributes\":",
                attributes,
                "}"
            )
        );

        return
            string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
