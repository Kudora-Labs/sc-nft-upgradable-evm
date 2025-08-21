import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { routerModule } from "./Router";

export const routerWire = buildModule("RouterWire", (m) => {
    const { routerInstance } = m.useModule(routerModule);

    const nftCore = m.getParameter<string>("nftCore");
    const metadataRendererExtension = m.getParameter<string>("metadataRendererExtension");
    const singleMintExtension = m.getParameter<string>("singleMintExtension");
    const batchMintExtension = m.getParameter<string>("batchMintExtension");

    m.call(routerInstance, "setNFTCore", [nftCore], { id: "setNFTCore" });
    m.call(routerInstance, "setMetadataRendererExtension", [metadataRendererExtension], {
        id: "setMetadataRendererExtension",
    });
    m.call(routerInstance, "setSingleMintExtension", [singleMintExtension], {
        id: "setSingleMintExtension",
    });
    m.call(routerInstance, "setBatchMintExtension", [batchMintExtension], {
        id: "setBatchMintExtension",
    });

    return { routerInstance };
});
