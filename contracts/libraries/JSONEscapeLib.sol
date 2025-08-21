// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library JSONEscapeLib {
    function escapeJSON(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        bytes memory escaped = new bytes(inputBytes.length * 6);
        uint256 j = 0;

        for (uint256 i = 0; i < inputBytes.length; i++) {
            bytes1 char = inputBytes[i];
            if (char == bytes1(uint8(0x22))) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1(uint8(0x22));
            } else if (char == bytes1(uint8(0x5c))) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1(uint8(0x5c));
            } else if (char == bytes1(uint8(0x2f))) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1(uint8(0x2f));
            } else if (char == bytes1(uint8(0x08))) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("b");
            } else if (char == bytes1(uint8(0x0C))) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("f");
            } else if (char == bytes1("\n")) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("n");
            } else if (char == bytes1("\r")) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("r");
            } else if (char == bytes1("\t")) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("t");
            } else if (uint8(char) < 0x20) {
                escaped[j++] = bytes1(uint8(0x5c));
                escaped[j++] = bytes1("u");
                escaped[j++] = bytes1("0");
                escaped[j++] = bytes1("0");
                bytes1 high = bytes1(uint8(char) / 16);
                bytes1 low = bytes1(uint8(char) % 16);
                escaped[j++] = _toHexChar(high);
                escaped[j++] = _toHexChar(low);
            } else {
                escaped[j++] = char;
            }
        }

        bytes memory result = new bytes(j);
        for (uint256 i = 0; i < j; i++) {
            result[i] = escaped[i];
        }
        return string(result);
    }

    function _toHexChar(bytes1 b) private pure returns (bytes1) {
        if (uint8(b) < 10) {
            return bytes1(uint8(b) + 48);
        }
        return bytes1(uint8(b) + 87);
    }
}
