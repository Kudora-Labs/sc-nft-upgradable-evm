# Best Practices — Project Architecture & Coding Guide

> This document standardizes how we structure, name, and write smart contracts in this repo. The goal is readability, auditability, consistency, and safety without over-engineering.

## Table of Contents

- [Best Practices — Project Architecture \& Coding Guide](#best-practices--project-architecture--coding-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Repository Layout](#1-repository-layout)
  - [2. File Headers \& Import Order](#2-file-headers--import-order)
  - [3. Naming \& File Naming](#3-naming--file-naming)
    - [General](#general)
    - [Interfaces](#interfaces)
    - [Libraries](#libraries)
    - [Extensions](#extensions)
    - [Types](#types)
    - [File naming](#file-naming)
    - [Storage naming patterns](#storage-naming-patterns)
    - [Function naming patterns](#function-naming-patterns)
    - [Event and error naming](#event-and-error-naming)
    - [Parameter naming](#parameter-naming)
  - [4. Code Ordering Inside A Contract](#4-code-ordering-inside-a-contract)
  - [5. Inheritance Clause Order](#5-inheritance-clause-order)
  - [6. Architecture Overview](#6-architecture-overview)
  - [7. Interfaces (DIP/ISP)](#7-interfaces-dipisp)
  - [8. Events, Errors \& Modifiers](#8-events-errors--modifiers)
  - [9. Address Validation \& External Calls](#9-address-validation--external-calls)
  - [10. State Mutating vs Views](#10-state-mutating-vs-views)
  - [11. Formatting \& Linting](#11-formatting--linting)
  - [12. Gas \& Safety Tips](#12-gas--safety-tips)
  - [13. Upgradeable Contracts](#13-upgradeable-contracts)

## 1. Repository Layout

```
contracts/
  core/                       # Core, permanent, minimal logic
    NFTCore.sol
  router/                     # Router (UUPS upgradeable) orchestrator
    Router.sol
  extensions/                 # Plug-in modules that call through Router
    BatchMintExtension.sol
    SingleMintExtension.sol
    MetadataRendererExtension.sol
  interfaces/                 # Narrow, consumer-centered interfaces
    IRouterForNFTCore.sol
    IRouterForMintExtension.sol
    IRouterForMetadataRendererExtension.sol
    IBatchMintExtension.sol
    ISingleMintExtension.sol
    IMetadataRendererExtension.sol
  libraries/                  # Pure stateless libs
    AddressChecksLib.sol
    CoreMetadataLib.sol
    JSONEscapeLib.sol
    MediaMetadataLib.sol
  types/                      # Typed structs
    CoreMetadata.sol
    MediaMetadata.sol
```

## 2. File Headers & Import Order

At the very top of every `.sol` file:

1. SPDX
2. `pragma solidity`
3. Imports in blocks:

    - (A) OpenZeppelin `@openzeppelin/contracts-upgradeable/...`
    - (B) Router consumer-specific interfaces `../interfaces/IRouterFor*`
    - (C) Extension module interfaces `../interfaces/I*`
    - (D) Project libraries `../libraries/*Lib.sol`
    - (E) Project core contracts `../core/*.sol`
    - (F) Project types `../types/*.sol`

Rules:

- One import per line. No wildcards.
- Alphabetical by symbol inside each block.
- Do not mix blocks. Omit unused blocks but preserve block order.
- Exactly one blank line between blocks; none extra at top or bottom.

## 3. Naming & File Naming

### General

- Contracts, Libraries, Interfaces, Errors, Events: `PascalCase`
- Functions, Modifiers, Variables, Locals, Parameters: `lowerCamelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private or `immutable` storage: `lowerCamelCase` with **no** leading underscores
- Internal/Private helper functions: a leading underscore is allowed; be consistent repo‑wide

### Interfaces

- Simple interfaces: `I` + `PascalCase`
  Examples: `IERC20`, `IAccessManager`, `IMetadataRenderer`
- Consumer‑scoped interfaces: `I` + Producer + `For` + Consumer
  Use when the same producer exposes tailored views for different consumers.
  Examples: `IRouterForNFTCore`, `IRouterForMintExtension`, `IRouterForMetadataRendererExtension`

### Libraries

- `*Lib` suffix
  Examples: `AddressChecksLib`, `CoreMetadataLib`, `OrderBookLib`

### Extensions

- `*Extension` suffix
  Examples: `BatchMintExtension`, `SingleMintExtension`, `MetadataRendererExtension`

### Types

- Struct‑only files under `/types`, named by domain
  Examples: `CoreMetadata.sol`, `MediaMetadata.sol`
  Enums: type name `PascalCase`, members `PascalCase`

### File naming

- One top‑level contract per file. File name exactly matches the contract name.

### Storage naming patterns

- Constants: `UPPER_SNAKE_CASE`
- Immutables: `lowerCamelCase` (no underscores)
- Public state: `lowerCamelCase`
- Boolean mappings: semantic prefixes `is*`, `has*`, `can*`
  Examples: `isMinter`, `hasClaimed`, `canMint`
- Non‑boolean mappings: noun or nounPhrase
  Examples: `supplyByCollection`, `ownerOfToken`

### Function naming patterns

- Mutating actions: verb first
  Examples: `setTreasury`, `addMinter`, `mintTo`, `upgradeTo`
- Views: nouns for getters, or verb+noun for computed reads
  Examples: `totalSupply`, `isAuthorizedMinter`, `quoteMint`
- Avoid `get*` unless mirroring a standard API such as `getApproved`
- Boolean checks: `is*`, `has*`, `can*`

### Event and error naming

- Events: `PascalCase`, result‑focused
  Examples: `MinterSet`, `TreasuryUpdated`, `Minted`
- Errors: `PascalCase`, optionally module‑scoped
  Examples: `NotMinter`, `ZeroAddress`, `MintTooLarge`

### Parameter naming

- Use explicit names: `routerAddress`, `newSingleMintExtension`, `recipient`, `amountBps`, `tokenId`
- Disambiguate addresses with `...Address` when helpful: `treasuryAddress`, `routerAddress`

## 4. Code Ordering Inside A Contract

1. **Extensions**

    Ordering: group by bound type; inside each type, list libraries alphabetically

    ```solidity
    // type uint256
    using MathLib for uint256;
    using SafeCast for uint256;

    // type Order
    using OrderLib for Order;
    ```

2. **Storage**

    Ordering: blocks in the order constants → immutables → public → mappings; inside each block, alphabetical by name

    ```solidity
    // constants
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MAX_SUPPLY = 10_000;

    // immutables
    address private immutable deployer;

    // public state
    address public admin;
    address public treasury;

    // mappings
    mapping(address => bool) public isMinter;
    mapping(bytes32 => bool) public isOrderUsed;
    ```

3. **Events**

    Ordering: alphabetical by event name

    ```solidity
    event MinterSet(address indexed account, bool allowed);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    ```

4. **Modifiers**

    Ordering: group related checks; alphabetical if no grouping

    ```solidity
    modifier onlyAdmin() { require(msg.sender == admin, "NOT_ADMIN"); _; }
    modifier onlyMinter() { require(isMinter[msg.sender], "NOT_MINTER"); _; }
    ```

5. **Initialization**

    Ordering: constructor first, then initialize helpers

    ```solidity
    constructor(address deployer_) {
        deployer = deployer_;
        _disableInitializers();
    }

    function initialize(address owner_, address treasury_) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        admin = owner_;
        treasury = treasury_;
        _transferOwnership(owner_);
    }
    ```

6. **EtherHandlers**

    Ordering: `receive` then `fallback`

    ```solidity
    receive() external payable {}
    fallback() external payable {}
    ```

7. **Actions**

    Ordering: group by logic domain (Admin, Minting, Treasury); alphabetical inside each group when flow does not dictate order

    ```solidity
    // Admin
    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }

    function setMinter(address a, bool ok) external onlyOwner {
        isMinter[a] = ok;
        emit MinterSet(a, ok);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // Minting
    function mintTo(address to, uint256 amount) external onlyMinter {
        /* ... */
    }

    // Treasury
    function sweep(address to, uint256 amount) external onlyAdmin {
        payable(to).transfer(amount);
    }
    ```

8. **Views**

    Ordering: group by logic domain; alphabetical inside a group when no natural flow

    ```solidity
    // Access
    function isAuthorizedMinter(address a) public view returns (bool) {
        return isMinter[a];
    }

    // Treasury
    function treasuryBalance() public view returns (uint256) {
        return address(treasury).balance;
    }
    ```

9. **Introspection**

    ```solidity
    function supportsInterface(bytes4 iid) public view virtual returns (bool) {
        return
            iid == type(IRouterForMetadataRendererExtension).interfaceId ||
            iid == type(IRouterForMintExtension).interfaceId ||
            iid == type(IRouterForNFTCore).interfaceId;
    }
    ```

10. **Helpers**

    Ordering: alphabetical by function name

    ```solidity
    function _pullPayment(address to, uint256 amount) internal {
        payable(to).transfer(amount);
    }
    function _requireNonZero(address a) internal pure {
        require(a != address(0), "ZERO_ADDRESS");
    }
    ```

## 5. Inheritance Clause Order

Call the `is` section the **inheritance clause** or **base contracts list**.

Parent order in `is`:

1. Primary concrete bases first
2. Interfaces or functional mixins next
3. Ownership or access control mixins last

```solidity
contract Router is
    // functional mixins
    Initializable,
    UUPSUpgradeable,
    // interfaces
    IRouterForMetadataRendererExtension,
    IRouterForMintExtension,
    IRouterForNFTCore,
    // access control
    OwnableUpgradeable
{
    // ...
}
```

## 6. Architecture Overview

- **NFTCore**: minimal, stable ERC‑721 core
  Mints gated by `onlyRouter`. Metadata events (`IERC4906`) emitted here. URI rendering delegated to Router.

- **Router** (UUPS): orchestrates metadata and mint flows
  Holds pointers to active extensions. Provides handler functions for extensions. Ownable; setters validate addresses; maintains invariants.

- **Extensions**: feature modules
  Depend on narrow Router interfaces (DIP/ISP). Hold no asset‑critical invariants.

- **Libraries**: stateless helpers and typed storage libs.

## 7. Interfaces (DIP/ISP)

Follow Dependency Inversion and Interface Segregation:

- Each consumer depends on a minimal Router interface:

    - `NFTCore` → `IRouterForNFTCore` (e.g., `handleRenderTokenURI`)
    - `BatchMintExtension` and `SingleMintExtension` → `IRouterForMintExtension`
    - `MetadataRendererExtension` → `IRouterForMetadataRendererExtension`

- Router implements these and uses `override(<Interface>)` where applicable.
- Consumers never depend on the concrete `Router` type.

## 8. Events, Errors & Modifiers

- **Errors**: custom errors, `PascalCase`, namespaced by contract or domain.

    Format: `Contract_ErrorName`

    Examples:
    `error Router_CoreMetadataAlreadySet(uint256 tokenId);`
    `error Router_MediaMetadataAlreadySet(uint256 tokenId);`
    `error Router_NotAuthorizedExtension(address caller);`
    `error SingleMintExtension_NotRouter();`
    `error SingleMintExtension_TokenIdZero();`

- **Events**: `PascalCase`; index frequently queried fields; do not re‑declare interface events.
  Examples: `MinterSet`, `TreasuryUpdated`

- **Emit after effects**: emit events after state changes.

- **Modifiers**: short and descriptive.
  Examples: `onlyRouter`, `onlyActiveExtension`, `whenSaleOpen`

## 9. Address Validation & External Calls

- Validate non‑zero **and** contract code for any external address set via constructor or admin setter.

Router and extensions: use `AddressChecksLib.ensureNonZeroContract("label")` inline

```solidity
using AddressChecksLib for address;

batchMintExtension = IBatchMintExtension(
  newBatchMintExtension.ensureNonZeroContract("newBatchMintExtension")
);
```

NFTCore keeps an inline check to avoid extra deps:

```solidity
if (routerAddress == address(0) || routerAddress.code.length == 0) {
    revert InvalidRouterAddress();
}
```

## 10. State Mutating vs Views

- Mutating first: minting, setting pointers, writing metadata
- Views next: public reads like `tokenURI`, then helper reads, then `supportsInterface` last
- `tokenURI` may call out to Router via `eth_call`; you may wrap in `try/catch` for friendlier errors on renderer failures

Example:

```solidity
function tokenURI(uint256 id) public view override returns (string memory) {
    try router.tokenURI(id) returns (string memory uri) {
        return uri;
    } catch {
        return _fallbackTokenURI(id);
    }
}
```

## 11. Formatting & Linting

- Use Prettier with `prettier-plugin-solidity` and set it as the default Solidity formatter.
- Recommended settings:

    - `printWidth: 100`
    - `tabWidth: 4`
    - `singleQuote: false`
    - `bracketSpacing: true`

## 12. Gas & Safety Tips

- Prefer custom errors over `require(string)`
- Emit events after effects
- Use unchecked increments in tight loops:

```solidity
for (uint256 i; i < length; ) {
    // ...
    unchecked { ++i; }
}
```

- Keep external dependencies behind sanity checks and circuit breakers where relevant

## 13. Upgradeable Contracts

- `Router` is UUPS‑upgradeable; do not reorder existing state variables.
- Add new variables only at the end.
