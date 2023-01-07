


Running specific tests

`npx hardhat test --grep 'permits setting name by owner'`


## Data Overview

Top Level Domain: `.country`
* Owned by the Base Registrar (set in ENSDeployer.sol (set_ownership))
* node value `ethers.utils.keccak256(ethers.utils.toUtf8Bytes('country'))`
  * `country node: 0xf1a1906f2fac0ea55077bc9cbf098b1a1374c3113629ef9fe79e93bba7aca4b1`
* Note this is different from `namehash.hash('country)`
  * `TLDHASH: 0xad4be81514036b9f6ff6c5f69394daacc516c82bd6dc4756d7f6ef1b3f9ea717`


SubDomain: `test.country`
* Owned by the User Registering the Domain

DNS Entries




# User Overview


