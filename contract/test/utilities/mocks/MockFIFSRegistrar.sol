// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol";

contract MockFIFSRegistrar is FIFSRegistrar {
    constructor(ENS ensAddr, bytes32 node) FIFSRegistrar(ensAddr, node) {}
}
