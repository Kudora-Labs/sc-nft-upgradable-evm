import type { TransactionReceipt } from "ethers";
import hre, { ethers } from "hardhat";

type GasReport = {
    gasUsed: string;
    gasPriceWei: string;
    gasPriceNative: string;
    totalWei: string;
    totalNative: string;
};

export const computeGasReport = async (
    receipt: TransactionReceipt,
    { txGasPrice }: { txGasPrice?: bigint } = {},
): Promise<GasReport> => {
    const { provider } = hre.ethers;

    let gasPrice: bigint;

    if (txGasPrice === undefined) {
        const tx = await provider.getTransaction(receipt.hash);

        if (!tx) {
            throw new Error(`❌ Transaction not found for the given receipt hash: ${receipt.hash}`);
        }
        gasPrice = tx.gasPrice;
    } else {
        gasPrice = txGasPrice;
    }

    const currency = hre.network.config.nativeCurrencySymbol;

    if (!currency) {
        throw new Error(`❌ NativeCurrencySymbol is not set for network "${hre.network.name}"`);
    }

    const totalWei = receipt.gasUsed * gasPrice;
    const totalNative = ethers.formatEther(totalWei);

    const gasPriceWei = gasPrice.toString();
    const gasPriceNative = ethers.formatEther(gasPrice);

    return {
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei,
        gasPriceNative,
        totalWei: totalWei.toString(),
        totalNative: `${totalNative} ${currency}`,
    };
};
