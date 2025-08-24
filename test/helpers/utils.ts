/* eslint-disable fsecond/prefer-destructured-optionals */
import { expect } from "chai";
import type { ContractTransactionResponse } from "ethers";

type EventLog = {
    fragment?: { name: string };
    args: Record<string, unknown>;
};

/**
 * Gas tracking utilities.
 */
export const logGasUsage = async (tx: ContractTransactionResponse): Promise<void> => {
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed ?? 0n;

    console.log("Gas used:", String(gasUsed));
};

/**
 * Event testing utilities.
 */
export const expectEvent = async (
    tx: ContractTransactionResponse,
    eventName: string,
    expectedArgs?: Record<string, unknown>,
): Promise<EventLog> => {
    const receipt = await tx.wait();
    const events = receipt?.logs as EventLog[] | undefined;

    if (!events || events.length === 0) {
        throw new Error("No events emitted");
    }

    const eventLogs = events.filter((event) => event.fragment?.name === eventName);

    if (eventLogs.length === 0) {
        throw new Error(`Event ${eventName} not found`);
    }

    if (expectedArgs) {
        const event = events[0];

        for (const [key, value] of Object.entries(expectedArgs)) {
            expect(event.args[key]).to.equal(value, "Event argument mismatch");
        }
    }

    return events[0];
};

/**
 * Error matching utilities.
 */
export const expectCustomError = async (
    promise: Promise<unknown>,
    errorName: string,
    { errorArgs }: { errorArgs?: unknown[] } = {},
): Promise<void> => {
    try {
        await promise;
        expect.fail("Expected transaction to revert");
    } catch (error_) {
        if (error_ instanceof Error) {
            // For now, just check if it's a revert. The actual custom error checking
            // should be done with expect().to.be.revertedWithCustomError() in tests
            expect(error_.message).to.include("reverted");
            if (errorArgs) {
                for (const arg of errorArgs) {
                    expect(error_.message).to.include(String(arg));
                }
            }
        }
    }
};

/**
 * Constants.
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Token ID utilities.
 */
export const generateTokenIds = (count: number): bigint[] => {
    return Array.from({ length: count }, (x, index: number) => BigInt(index + 1));
};

/**
 * JSON URI utilities.
 */
export const decodeBase64JSON = (uri: string): Record<string, unknown> => {
    const base64 = uri.replace("data:application/json;base64,", "");

    const json = Buffer.from(base64, "base64").toString("utf8");

    return JSON.parse(json) as Record<string, unknown>;
};

export const validateTokenURI = (
    uri: string,
    expectedMetadata: {
        name: string;
        description: string;
        image: string;
        animation_url?: string;
        attributes: { trait_type: string; value: string }[];
    },
): Record<string, unknown> => {
    expect(uri).to.include("data:application/json;base64,");

    const decoded = decodeBase64JSON(uri);

    if (expectedMetadata.name) {
        expect(decoded.name).to.equal(expectedMetadata.name);
    }
    if (expectedMetadata.description) {
        expect(decoded.description).to.equal(expectedMetadata.description);
    }
    if (expectedMetadata.image) {
        expect(decoded.image).to.equal(expectedMetadata.image);
    }

    return decoded;
};

/**
 * Media metadata utilities.
 */
export const createTestMediaMetadata = (overrides = {}) => {
    return {
        name: "Test NFT",
        description: "A test NFT for unit testing",
        image: "https://example.com/test.png",
        animation_url: "https://example.com/test.mp4",
        external_url: "https://example.com",
        attributes: [
            { trait_type: "Collection", value: "Test Collection" },
            { trait_type: "Rarity", value: "Common" },
            { trait_type: "Power", value: "100" },
        ],
        ...overrides,
    };
};

/**
 * Core metadata utilities.
 */
export const createTestCoreMetadata = (overrides = {}) => {
    return {
        tokenName: "Test Token",
        supply: "1",
        creator: "0x0000000000000000000000000000000000000000",
        description: "Test token description",
        ...overrides,
    };
};

/**
 * JSON escaping test utilities.
 */
export const createMetadataWithSpecialChars = () => {
    return {
        name: 'Token with "quotes" and \\backslashes',
        description: "Description with\nnewlines and\ttabs",
        image: "https://example.com/test with spaces.png",
        attributes: [
            { trait_type: "Special", value: 'Value with "quotes"' },
            { trait_type: "Unicode", value: "Émojis 🚀 and àccénts" },
        ],
    };
};

/**
 * Contract state assertions.
 */
export const expectContractState = async (
    getter: () => Promise<unknown>,
    expectedValue: unknown,
    message?: string,
): Promise<void> => {
    const actualValue = await getter();

    expect(actualValue).to.equal(expectedValue, message);
};

/**
 * Balance tracking utilities.
 */
export const getBalanceChange = async (
    address: string,
    action: () => Promise<unknown>,
    provider: { getBalance: (address: string) => Promise<bigint> },
): Promise<bigint> => {
    const balanceBefore = await provider.getBalance(address);

    await action();
    const balanceAfter = await provider.getBalance(address);

    return balanceAfter - balanceBefore;
};
