# ens-deployer Test Suite

## Overview
This folder holds test suites for deployment of ens contracts and reading writing of dns records.
It can be enhance further as functionality is rolled out.

We also publish abis in the [./abi](./abi) folder. This is manged using the [hardhat-abi-exporter](https://www.npmjs.com/package/hardhat-abi-exporter) package which has configuration options including the format of the abi's as well as which abi's to publish.

**TODO Items**
- [ ] Review logic when running all tests to ensure that timeouts do not occur.
- [ ] Review additional [ens tests](https://github.com/jw-ens-domains/ens-contracts/tree/master/test)
- [ ] Enhance DNS Record to support more [record types](https://en.wikipedia.org/wiki/List_of_DNS_record_types) as needed.

## Setup

**Initialize the repository**
```
git clone https://github.com/polymorpher/ens-deployer
cd ens-deployer/contract
yarn install
```

**Expose buffer functionality**

For testing we need to modify the [dns-js](https://www.npmjs.com/package/dns-js) package to expose `bufferwriter` and  `bufferconsumer` this is done by modifying [index.js](https://github.com/mdns-js/node-dns-js/blob/master/lib/index.js) by editing the file `node_modules/dns-js/lib/index.js` and adding two lines so the file is as follows
```
exports.BufferWriter = require('./bufferwriter');
exports.BufferConsumer = require('./bufferconsumer');
exports.DNSPacket = require('./dnspacket');
exports.DNSRecord = require('./dnsrecord');
exports.errors = require('./errors');
exports.parse = exports.DNSPacket.parse;
```
Also to enable deletion of A records need to modify writeA to return if no ip is passed `if (ip === '') { return; }`
Code is at `node_modules/dns-js/lib/dnsrecord.js`  function is modified as follows
```
function writeA(out, ip) {
  if (ip === '') { return; }
  var parts = ip.split('.');
  for (var i = 0; i < 4; i++) {
    out.byte(parts[i]);
  }
}
```
*Note: An alternative to above would be to modify DNSResolver.sol to check for a zero IP address in setDNSRecords*

## Testing

Test helpers added to package.json
* `yarn test`: runs all tests 
* `yarn test-deploy`: tests the deployment of all contracts
* `yarn test-dns`: tests the reading and writing of dns records

Running a functional area by file
`npx hardhat test ./test/deployment/Deployment.ts`

Running specific tests

`npx hardhat test --grep 'permits setting name by owner'`


## Writing tests

We use hardhat, waffle, chai and ethers for testing. 
Tests are designed to be executed indvidually, as a suite or running all tests.
As such we take snapshots and revert beforeach test and do any initialization at the functional level.

Following are some useful references
* [ethers utilities](https://docs.ethers.org/v5/api/utils/): Useful utilties 
* [Waffle Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#): Useful for solidity specific tests.
* [Chai Assertion Library](https://www.chaijs.com/api/assert/): General assertions, also review [BDD styles expect and should](https://www.chaijs.com/api/assert/)
* [console.log](https://hardhat.org/hardhat-network/docs/reference#console.log): useful to debug solidity contracts.
* [ens documentation](https://docs.ens.domains/): useful for understaning functionality being developed
* [DNS Record Types](https://en.wikipedia.org/wiki/List_of_DNS_record_types): List of all DNS record types
* [dns-packet](https://www.npmjs.com/package/dns-packet): Good overview of DNS record structures
* [dns-js](https://www.npmjs.com/package/dns-js): Used for writing DNS records, detailed logic can be found in [dnsrecord.js](https://github.com/mdns-js/node-dns-js/blob/master/lib/dnsrecord.js) 


## Domain Registration

Example walkthrough for registering "test.country" which will be used next in DNS record mapping

For `test.country` registration
* `country` = TLD
* `test`  = Tier2
* `test.` = registerDOMAIN = DOMAIN + '.' //Name used for registration (does not include the TLD)
  
For `test.country` DNS updates
* `0xd8c8e2c8c30a5ef6434277d00289c6626ef4d8757ac559e737a3d51b663ea489` = node =
    ```
      const parentHash = namehash.hash('country)
      const childK256 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'))
      return ethers.utils.keccak256(ethers.utils.concat([parentHash, childK256]))
    ```
* `test.country.`  = nameDOMAIN = (DOMAIN + '.' + TLD + '.')
*  `0xa96719bd5358231beb1a10bef823abf4d37e428fed2993d459f4e67179238f60` = nameDOMAINHash = ethers.utils.keccak256(dns.dnsName(nameDOMAIN))
aNameHash: 0x92dce4ed24b46de912a07d01663fe453d2bbbf8c0ee6aae04e97f3179c652d9f
* `a.test.counry` = aName = 'a.' + nameDOMAIN //name for a.test.country subdomain
* `0x92dce4ed24b46de912a07d01663fe453d2bbbf8c0ee6aae04e97f3179c652d9f` =  aNameHash = ethers.utils.keccak256(dns.dnsName(aName))


**Retreiving the owner of the node**
You can retreive the owner of the node using `await this.ens.owner(node)` where
* ens: is ENSRegistry.sol
* node: is calculated for `test.country` as described above

Initially (before registration) this will be the zero address `0x0000000000000000000000000000000000000000`

After alice registers `test.country` the owner address will be set to that of the `TLDNameWrapper.sol` e.g. ( `this.nameWrapper.address` = `0xB7aa4c318000BB9bD16108F81C40D02E48af1C42`)

## DNS Record Mapping

For a complete list of DNS record types see [this wikiepedia page](https://en.wikipedia.org/wiki/List_of_DNS_record_types)

For Record types and data strucures see [dns-packet](https://www.npmjs.com/package/dns-packet).

For detailedrecord field mapping we use [dns-js](https://www.npmjs.com/package/dns-js) logic is in [dnsrecord.js](https://github.com/mdns-js/node-dns-js/blob/master/lib/dnsrecord.js).

Implementaion of mappings are documented in [./utilities/dns.ts](./utilities/dns.ts).


**RR Structure from dnssec-oracle RRUtils.sol**
```
struct RRIterator {
  bytes data;
  uint256 offset;
  uint16 dnstype;
  uint16 class;
  uint32 ttl;
  uint256 rdataOffset;
  uint256 nextOffset;
}
```

**Sample request with multiple iterators**
Request: `0x016107636f756e747279000001000100000e10000401020304016207636f756e747279000001000100000e10000402030405016207636f756e747279000001000100000e1000040304050607636f756e747279000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840`

Contains Records
```
a.country. 3600 IN A 1.2.3.4
b.country. 3600 IN A 2.3.4.5
b.country. 3600 IN A 3.4.5.6
country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
```

**Sample Iterator mapping**
* Record being added: `a.country. 3600 IN A 1.2.3.4`
* Value Passed: `016107636f756e747279000001000100000e10000401020304`
  * 016107636f756e74727900 : kecacak256 of dnsName
  * 0001000100000e100004: other fields including TTL and Record Type
  * 01020304 : value (IP Address)

**Fields encoded in setDNS Record (for each iterator)**

```
     uint16 dnstype; 01
     uint16 class; 61
     uint32 ttl;
     uint256 rdataOffset;
     name  (calculated from data)
     value (calculated from data)
```

**Sample RRIterator data**
RRSIG.RRUTILS: data, offset, dnstype,class,ttL, rdataOffset, nextOffset, name, value

* data: `0x016107636f756e747279000001000100000e10000401020304016207636f756e747279000001000100000e10000402030405016207636f756e747279000001000100000e1000040304050607636f756e747279000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840`
* offset: `25`
* dnstype: `1`
* class: `1`
* TTL: `3600`
* rdataOffset: `46`
* nextOffset: `50`
* name: `0x016207636f756e74727900`
* value: `0x02030405`

## Appendicies

### Sample test-dns run
```
johnlaptop contract (web2) $ yarn test-dns
yarn run v1.22.19
$ npx hardhat test ./test/dns/DNS.ts
No need to generate any newer typings.
 ·-------------------------------|--------------|----------------·
 |  Contract Name                ·  Size (KiB)  ·  Change (KiB)  │
 ································|··············|·················
 |  Address                      ·       0.084  ·                │
 ································|··············|·················
 |  BaseRegistrarImplementation  ·       7.321  ·                │
 ································|··············|·················
 |  Buffer                       ·       0.084  ·                │
 ································|··············|·················
 |  BytesUtils                   ·       0.084  ·                │
 ································|··············|·················
 |  BytesUtils                   ·       0.084  ·                │
 ································|··············|·················
 |  console                      ·       0.084  ·                │
 ································|··············|·················
 |  Controllable                 ·       0.799  ·                │
 ································|··············|·················
 |  Controllable                 ·       0.799  ·                │
 ································|··············|·················
 |  DummyOracle                  ·       0.168  ·                │
 ································|··············|·················
 |  ENSControllerDeployer        ·       9.678  ·                │
 ································|··············|·················
 |  ENSDeployer                  ·      17.640  ·                │
 ································|··············|·················
 |  ENSNFTDeployer               ·      23.130  ·                │
 ································|··············|·················
 |  ENSPublicResolverDeployer    ·      12.341  ·                │
 ································|··············|·················
 |  ENSRegistry                  ·       2.427  ·                │
 ································|··············|·················
 |  ENSRegistryDeployer          ·      16.554  ·                │
 ································|··············|·················
 |  ENSUtils                     ·       0.458  ·                │
 ································|··············|·················
 |  ERC20Recoverable             ·       0.796  ·                │
 ································|··············|·················
 |  ERC721                       ·       4.261  ·                │
 ································|··············|·················
 |  FIFSRegistrar                ·       0.574  ·                │
 ································|··············|·················
 |  LowLevelCallUtils            ·       0.084  ·                │
 ································|··············|·················
 |  Multicall3                   ·       3.202  ·                │
 ································|··············|·················
 |  NameEncoder                  ·       0.084  ·                │
 ································|··············|·················
 |  OracleDeployer               ·       0.607  ·                │
 ································|··············|·················
 |  PublicResolver               ·      11.163  ·                │
 ································|··············|·················
 |  RegistrarController          ·       7.704  ·                │
 ································|··············|·················
 |  ReverseRegistrar             ·       3.119  ·                │
 ································|··············|·················
 |  RRUtils                      ·       0.084  ·                │
 ································|··············|·················
 |  SafeMath                     ·       0.084  ·                │
 ································|··············|·················
 |  StablePriceOracle            ·       1.901  ·                │
 ································|··············|·················
 |  StaticMetadataService        ·       0.441  ·                │
 ································|··············|·················
 |  Strings                      ·       0.084  ·                │
 ································|··············|·················
 |  StringUtils                  ·       0.084  ·                │
 ································|··············|·················
 |  TLDNameWrapper               ·      19.767  ·                │
 ································|··············|·················
 |  UniversalResolver            ·      11.788  ·                │
 ·-------------------------------|--------------|----------------·


  DNS Tests
ORACLE_UNIT_PRICE 330000
deployer account 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- oracleDeployer: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- priceOracle: 0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968
- usdOracle: 0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
- ENSDeployer deployed to: 0x0165878A594ca255338adfa4d48449f69242Eb8F
- ens deployed to: 0x3B02fF1e626Ed7a8fd6eC5299e2C54e1421B626B
- fifsRegistrar deployed to: 0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762
- reverseRegistrar deployed to: 0x7ab4C4804197531f7ed6A6bc0f0781f706ff7953
- baseRegistrar deployed to: 0xc8CB5439c767A63aca1c01862252B2F3495fDcFE
- metadataService deployed to: 0xD79aE87F2c003Ec925fB7e9C11585709bfe41473
- nameWrapper deployed to: 0xB7aa4c318000BB9bD16108F81C40D02E48af1C42
- registrarController deployed to: 0x12653A08808F651D5BB78514F377d3BD5E17934C
- publicResolver deployed to: 0xCaA29B65446aBF1A513A178402A0408eB3AEee75
- universalResolver deployed to: 0x09F428b7D940ED8Bff862e81a103bf022F5E50F0
ensDeployer.transferOwner tx 0xb9d767d1c0c641b629bfdd2d3b8f46385447ecd1a73941a412f0979f546f1edb
ens owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
resolver node owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
reverse registrar node owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
setting DNSRRset
setting DNSRRset
recordText: 047465737407636f756e747279000010000100000000002803303d5303313d6103323d6d03333d7003343d6c03353d6503363d5403373d6503383d7803393d74
    ✔ DNS-015 should handle TXT record updates
    DNS: Check the reading of initial DNS Entries
      ✔ DNS-001 permits setting name by owner
setting DNSRRset
      ✔ DNS-002 should update existing records (43ms)
      ✔ DNS-003 should keep track of entries (62ms)
      ✔ DNS-004 should handle single-record updates
      ✔ DNS-005 forbids setting DNS records by non-owners
      ✔ DNS-006 permits setting zonehash by owner
      ✔ DNS-007 can overwrite previously set zonehash
      ✔ DNS-008 can overwrite to same zonehash
      ✔ DNS-009 forbids setting zonehash by non-owners
      ✔ DNS-010 forbids writing same zonehash by non-owners
      ✔ DNS-011 returns empty when fetching nonexistent zonehash
      ✔ DNS-012 emits the correct event (43ms)
      ✔ DNS-013 resets dnsRecords on version change
      ✔ DNS-014 resets zonehash on version change


  15 passing (3s)

✨  Done in 5.02s.
johnlaptop contract (web2) $
```