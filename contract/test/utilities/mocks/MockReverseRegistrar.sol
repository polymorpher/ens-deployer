// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/registry/ReverseRegistrar.sol";

contract MockReverseRegistrar is ReverseRegistrar {
    constructor(ENS ensAddr) ReverseRegistrar(ensAddr) {}
}
