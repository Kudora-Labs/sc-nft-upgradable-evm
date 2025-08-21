import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
import "hardhat-tracer";
import { task } from "hardhat/config";
import type { HardhatUserConfig } from "hardhat/types/config";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
declare module "hardhat/types/config" {
    interface HttpNetworkUserConfig {
        routerConfigFile?: string;
        nativeCurrencySymbol?: string;
    }
    interface HardhatNetworkUserConfig {
        routerConfigFile?: string;
        nativeCurrencySymbol?: string;
    }
    interface HttpNetworkConfig {
        routerConfigFile?: string;
        nativeCurrencySymbol?: string;
    }
    interface HardhatNetworkConfig {
        routerConfigFile?: string;
        nativeCurrencySymbol?: string;
    }
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */

const mustEnv = (name: string): string => {
    const v = process.env[name];

    if (!v) {
        throw new Error(`Missing ${name} in .env`);
    }

    return v.trim();
};

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.28",
        settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
    },
    networks: {
        avalanche: {
            accounts: [mustEnv("PRIVATE_KEY")],
            routerConfigFile: "ignition/configs/43114-avalanche.json",
            nativeCurrencySymbol: "AVAX",
            url: "https://api.avax.network/ext/bc/C/rpc",
        },
        fuji: {
            accounts: [mustEnv("PRIVATE_KEY")],
            routerConfigFile: "ignition/configs/43113-fuji.json",
            nativeCurrencySymbol: "AVAX",
            url: "https://api.avax-test.network/ext/bc/C/rpc",
        },
    },
    etherscan: {
        apiKey: {
            avalanche: mustEnv("ETHERSCAN_API_KEY"),
            fuji: mustEnv("ETHERSCAN_API_KEY"),
        },
    },
    tracer: { enabled: true },
};

export default config;

task(
    "Ignition:RouterConfigFile",
    "Print the Router config file path for the current network",
).setAction((unusedArgs, hre) => {
    const p = (hre.network.config as { routerConfigFile?: string }).routerConfigFile;

    if (p) {
        console.log(p);
    }

    return Promise.resolve();
});
