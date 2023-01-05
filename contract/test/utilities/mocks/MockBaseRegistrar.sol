// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/ethregistrar/BaseRegistrarImplementation.sol";

contract MockBaseRegistrar is BaseRegistrarImplementation {
    constructor(ENS _ens, bytes32 _baseNode) BaseRegistrarImplementation(_ens, _baseNode) {}
}
