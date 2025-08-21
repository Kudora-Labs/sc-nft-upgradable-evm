/* eslint-disable import/no-default-export */
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const routerModule = buildModule("Router", (m) => {
    const routerImplementation = m.contract("Router", [], { id: "routerImplementation" });

    const owner = m.getParameter<string>("owner");
    const initData = m.encodeFunctionCall(routerImplementation, "initialize", [owner]);

    const routerProxyContract = m.contract("ERC1967Proxy", [routerImplementation, initData], {
        id: "routerProxy",
    });

    const routerInstance = m.contractAt("Router", routerProxyContract, {
        id: "routerInstance",
    });

    return {
        routerImplementation,
        routerProxyContract,
        routerInstance,
    };
});

export default routerModule;
