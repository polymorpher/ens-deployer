// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";

contract MockENSRegistry is ENSRegistry {
    constructor() ENSRegistry() {}
}
