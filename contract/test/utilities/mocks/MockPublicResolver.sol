// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";

contract MockPublicResolver is PublicResolver {
    constructor(
        ENS _ens,
        INameWrapper wrapperAddress,
        address _trustedETHController,
        address _trustedReverseRegistrar
    ) PublicResolver(_ens, wrapperAddress, _trustedETHController, _trustedReverseRegistrar) {}
}
