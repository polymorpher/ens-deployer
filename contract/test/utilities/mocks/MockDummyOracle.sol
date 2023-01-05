// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/ethregistrar/DummyOracle.sol";

contract MockDummyOracle is DummyOracle {
    constructor(int256 _value) DummyOracle(_value) {}
}
