// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library AddressChecksLib {
    error ZeroAddress(string field);
    error NotAContract(string field);

    function ensureNonZero(address a, string memory field) internal pure returns (address) {
        if (a == address(0)) revert ZeroAddress(field);
        return a;
    }

    function ensureContract(address a, string memory field) internal view returns (address) {
        if (a.code.length == 0) revert NotAContract(field);
        return a;
    }

    function ensureNonZeroContract(address a, string memory field) internal view returns (address) {
        if (a == address(0)) revert ZeroAddress(field);
        if (a.code.length == 0) revert NotAContract(field);
        return a;
    }
}
