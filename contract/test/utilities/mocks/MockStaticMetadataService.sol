// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "@ensdomains/ens-contracts/contracts/wrapper/StaticMetadataService.sol";

contract MockStaticMetadataService is StaticMetadataService {
    constructor(string memory _metaDataUri) StaticMetadataService(_metaDataUri) {}
}
