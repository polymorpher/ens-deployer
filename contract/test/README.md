# ens-deployer tests

## Overview

The tests are divided in two major areas: contract deployment, and DNS records R/W.

As of now, only A, SOA, TXT records are tested. We will extend for more later.

## Known issues

Deletion of A records is not supported due to an underlying bug in `dns-js/lib/dnsrecord.js`. This will be fixed later as we fork `dns-js` package.

## Testing

* `yarn test`: runs all tests 
* `yarn test-deploy`: tests the deployment of all contracts
* `yarn test-dns`: tests the reading and writing of DNS records through DNSResolver contract

You can run specific tests using:

`npx hardhat test --grep 'permits setting name by owner'`

## About DNS records

Please consult with the following references:

* [DNS Record Types](https://en.wikipedia.org/wiki/List_of_DNS_record_types): List of all DNS record types
* [dns-packet](https://www.npmjs.com/package/dns-packet): Overview of DNS record structures
* [dns-js](https://www.npmjs.com/package/dns-js): Serialization and formatting of DNS records. See also [dnsrecord.js](https://github.com/mdns-js/node-dns-js/blob/master/lib/dnsrecord.js) 

## Domain Registration

### Terminologies

Using `test.country` as an example:

* `country` is TLD
* `test` is SLD (second level domain)
* `test.country.` is FQDN (fully-qualified domain name)
* "node" of the domain, obtained via [namehash](https://docs.ens.domains/contract-api-reference/name-processing), computed by:
  ```
    const parentHash = namehash.hash('country')
    const childK256 = ethers.utils.id('test.country')
    return ethers.utils.keccak256(ethers.utils.concat([parentHash, childK256]))
  ```
  The example domain's node value is `0x6ccdbd41a174e9b5e34bffee7b0cc45c3ef17f8763cd491f14bc52dbb550b3b2`
* "domain-hash" of the domain, obtained by computing the keccak256 hash of the RFC1035-encoded DNS-name of the FQDN. See `dnsName` in `lib/dns.ts` for a reference implementation of DNS-name. The example domain's domain-hash is `0xa96719bd5358231beb1a10bef823abf4d37e428fed2993d459f4e67179238f60`
* "domain-hash" extends to further subdomains. For example, the domain-hash of `a.test.country` is `0x92dce4ed24b46de912a07d01663fe453d2bbbf8c0ee6aae04e97f3179c652d9f`

### (Sub)node Owner

In ENS, the owner of a node used to be the user's wallet address. In newer versions, the ownership is instead given to the contract that manages the said domain. For example, ENS uses a ETHRegistrarController to manage registrations, which delegates the management to a NameWrapper contract. Under this setup, the NameWrapper becomes the owner of a node. 

In our customizations, these contracts are named as RegistrarController and TLDNameWrapper instead, which provide extra functionalities. 

To examine the ownership on ENS registry, you may try using `await this.ens.owner(node)`, where

* `ens` represents a deployed contract instance of ENSRegistry
* `node` represents the node of domain `test.country`

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