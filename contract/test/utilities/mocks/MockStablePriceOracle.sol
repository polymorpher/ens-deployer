// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/ethregistrar/StablePriceOracle.sol";

contract MockStablePriceOracle is StablePriceOracle {
    constructor(AggregatorInterface _usdOracle, uint256[] memory _rentPrices) StablePriceOracle(_usdOracle, _rentPrices) {}
}
