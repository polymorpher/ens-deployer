// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/utils/UniversalResolver.sol";

contract MockUniversalResolver is UniversalResolver {
    constructor(address _registry, string[] memory _urls) UniversalResolver(_registry, _urls) {}
}
