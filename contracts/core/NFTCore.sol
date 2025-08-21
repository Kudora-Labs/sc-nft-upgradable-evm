// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Router } from "../router/Router.sol";

error InvalidRecipientAddress();
error InvalidRouterAddress();
error InvalidTokenId();
error TokenDoesNotExist();
error UnauthorizedRouterAccess();

contract NFTCore is ERC721, Ownable {
    Router public immutable router;

    event NFTMinted(address indexed to, uint256 indexed tokenId);

    constructor(address routerAddress) ERC721("NFT Collection", "NFT") Ownable(msg.sender) {
        if (routerAddress == address(0)) revert InvalidRouterAddress();
        router = Router(routerAddress);
    }

    modifier onlyRouter() {
        if (msg.sender != address(router)) revert UnauthorizedRouterAccess();
        _;
    }

    function mintToken(address to, uint256 tokenId) external onlyRouter {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (tokenId == 0) revert InvalidTokenId();

        emit NFTMinted(to, tokenId);
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return router.handleRenderTokenURI(tokenId);
    }
}
