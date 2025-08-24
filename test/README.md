# Test Documentation

## Overview

This test suite provides comprehensive coverage for the upgradeable NFT contract system. The tests are organized into logical modules and follow industry best practices for smart contract testing.

## Test Structure

```
test/
├── helpers/
│   ├── fixtures.ts       # Deployment fixtures and test data
│   └── utils.ts          # Common testing utilities
├── core/
│   └── NFTCore.test.ts   # ERC721 core functionality tests
├── router/
│   └── Router.test.ts    # Upgradeable router and proxy tests
├── extensions/
│   ├── SingleMintExtension.test.ts     # Single NFT minting tests
│   ├── BatchMintExtension.test.ts      # Batch NFT minting tests
│   └── MetadataRendererExtension.test.ts # Metadata rendering tests
└── integration/
    └── Integration.test.ts # End-to-end system tests
```

## Test Categories

### 1. Core Tests (`test/core/`)
- **NFTCore.test.ts**: Tests the base ERC721 implementation
  - Contract deployment and initialization
  - Router integration
  - Minting functionality
  - Token URI delegation
  - Access control (onlyRouter modifier)
  - ERC721 standard compliance

### 2. Router Tests (`test/router/`)
- **Router.test.ts**: Tests the upgradeable router contract
  - UUPS proxy deployment and initialization
  - Extension management (add/remove/configure)
  - Metadata delegation to extensions
  - Access control (onlyOwner)
  - Upgradeability and state preservation

### 3. Extension Tests (`test/extensions/`)
- **SingleMintExtension.test.ts**: Single NFT minting functionality
  - Individual token minting
  - Metadata handling and validation
  - Access control for minting operations
  - Error scenarios and edge cases

- **BatchMintExtension.test.ts**: Batch NFT minting functionality
  - Multiple token minting in single transaction
  - Gas optimization for batch operations
  - Batch size limits and validation
  - Metadata consistency across batches

- **MetadataRendererExtension.test.ts**: Metadata rendering and URI generation
  - Base64 JSON encoding/decoding
  - Dynamic metadata generation
  - URI format validation
  - JSON escaping for special characters

### 4. Integration Tests (`test/integration/`)
- **Integration.test.ts**: End-to-end system scenarios
  - Complete minting workflows
  - Multi-user interactions
  - Cross-extension functionality
  - Gas optimization verification
  - System limits and edge cases
  - Error handling across components

## Test Utilities

### Fixtures (`test/helpers/fixtures.ts`)
- **deployFixture()**: Deploys all contracts with proper configuration
- **sampleMetadata**: Predefined metadata objects for testing
- **TestFixture**: TypeScript interface for deployed contracts

### Utilities (`test/helpers/utils.ts`)
- **expectCustomError()**: Helper for testing custom error conditions
- **validateTokenURI()**: Validates and parses token URI format
- **decodeBase64JSON()**: Decodes base64-encoded JSON metadata
- **generateTokenIds()**: Generates arrays of token IDs for batch operations

## Running Tests

### All Tests
```bash
npm run test
```

### Specific Test Categories
```bash
npm run test:core        # Core contract tests
npm run test:router      # Router contract tests
npm run test:extensions  # Extension tests
npm run test:integration # Integration tests
```

### Coverage and Gas Reports
```bash
npm run test:coverage    # Generate coverage report
npm run test:gas        # Generate gas usage report
```

## Test Best Practices Implemented

### 1. Comprehensive Coverage
- **Unit Tests**: Each contract component tested in isolation
- **Integration Tests**: Cross-contract interactions and workflows
- **Edge Cases**: Boundary conditions and error scenarios
- **Gas Optimization**: Performance and cost validation

### 2. TypeScript Integration
- **Type Safety**: Full TypeScript typing with TypeChain
- **Contract Types**: Auto-generated contract interfaces
- **Test Utilities**: Strongly typed helper functions
- **Error Handling**: Type-safe error assertions

### 3. Clean Architecture
- **Separation of Concerns**: Logical test organization
- **Reusable Components**: Shared fixtures and utilities
- **Maintainable Code**: Clear naming and documentation
- **Modular Design**: Independent test modules

### 4. Industry Standards
- **Chai/Mocha**: Standard testing framework
- **Hardhat Integration**: Native blockchain testing
- **OpenZeppelin Patterns**: Following established practices
- **Gas Reporting**: Performance monitoring

## Contract Architecture Tested

### Core Components
- **NFTCore**: ERC721 base implementation with router delegation
- **Router**: Upgradeable proxy with extension management
- **Extensions**: Modular functionality (minting, metadata)

### Key Features Validated
- **Upgradeability**: UUPS proxy pattern implementation
- **Modularity**: Extension-based architecture
- **Security**: Access control and permission validation
- **Standards Compliance**: ERC721 and OpenZeppelin compatibility
- **Gas Efficiency**: Optimized operations and batch processing

## Test Data and Scenarios

### Sample Metadata
- **Basic NFT**: Standard name, description, image
- **Rich Media**: Multiple images, attributes, external URLs
- **Complex Attributes**: Various trait types and values
- **Edge Cases**: Special characters, long strings, empty fields

### User Scenarios
- **Single User**: Individual minting and transfers
- **Multiple Users**: Concurrent operations and permissions
- **Admin Operations**: Extension management and upgrades
- **Error Conditions**: Invalid inputs and unauthorized access

## Continuous Integration

The test suite is designed for CI/CD integration with:
- **Automated Testing**: All tests run on code changes
- **Coverage Reporting**: Track test coverage metrics
- **Gas Monitoring**: Monitor gas usage trends
- **Lint Validation**: Code quality enforcement

## Contributing to Tests

When adding new functionality:
1. **Add Unit Tests**: Test new functions in isolation
2. **Update Integration**: Include in end-to-end scenarios
3. **Document Changes**: Update this documentation
4. **Validate Coverage**: Ensure adequate test coverage
5. **Follow Patterns**: Use existing test structure and utilities
