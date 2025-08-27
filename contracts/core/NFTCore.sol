// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC4906 } from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import { IRouterForNFTCore } from "../interfaces/IRouterForNFTCore.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

error InvalidRecipientAddress();
error InvalidRouterAddress();
error InvalidTokenId();
error TokenDoesNotExist();
error UnauthorizedRouterAccess();

contract NFTCore is ERC721, IERC4906, Ownable {
    IRouterForNFTCore public immutable router;

    event NFTMinted(address indexed to, uint256 indexed tokenId);

    constructor(address routerAddress) ERC721("NFT Collection", "NFT") Ownable(msg.sender) {
        if (routerAddress == address(0) || routerAddress.code.length == 0) {
            revert InvalidRouterAddress();
        }
        router = IRouterForNFTCore(routerAddress);
    }

    modifier onlyRouter() {
        if (msg.sender != address(router)) revert UnauthorizedRouterAccess();
        _;
    }

    function emitBatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId) external onlyRouter {
        emit BatchMetadataUpdate(fromTokenId, toTokenId);
    }

    function emitMetadataUpdate(uint256 tokenId) external onlyRouter {
        emit MetadataUpdate(tokenId);
    }

    function mintToken(address to, uint256 tokenId) external onlyRouter {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (tokenId == 0) revert InvalidTokenId();

        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return router.handleRenderTokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, IERC165) returns (bool) {
        return interfaceId == type(IERC4906).interfaceId || super.supportsInterface(interfaceId);
    }
}
