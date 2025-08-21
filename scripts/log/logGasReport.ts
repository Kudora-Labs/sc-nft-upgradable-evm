type GasReport = {
    gasUsed: string;
    gasPriceWei: string;
    gasPriceNative: string;
    totalWei: string;
    totalNative: string;
};

export const logGasReport = (report: GasReport) => {
    console.log("— Gas Report —");
    console.log(`Gas Used: ${report.gasUsed}`);
    console.log(`Gas Price (Base Unit): ${report.gasPriceWei}`);
    console.log(`Gas Price (Native): ${report.gasPriceNative}`);
    console.log(`Total (Base Unit): ${report.totalWei}`);
    console.log(`Total (Native): ${report.totalNative}`);
    console.log();
};
