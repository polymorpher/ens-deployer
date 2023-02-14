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

## DNS Record References

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

### DNS Record R/W

DNS records are encoded from JSON format into wire-format before being written on-chain via DNSResolver's setDnsRecord function. See example encoding implementations in [./utilities/dns.ts](./utilities/dns.ts). Note that multiple entries of records (for different subdomains and DNS types) are encoded as one message. 

In the contract, an `RRIterator` is used to incrementally read from encoded DNS records in wire-format. See implementation in `RRUtils.sol` and usage in `DNSResolver.sol`

#### Example

Records encoded in wire-format: `0x016107636f756e747279000001000100000e10000401020304016207636f756e747279000001000100000e10000402030405016207636f756e747279000001000100000e1000040304050607636f756e747279000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840`

RFC1035 format, before encoding:

```
a.country. 3600 IN A 1.2.3.4
b.country. 3600 IN A 2.3.4.5
b.country. 3600 IN A 3.4.5.6
country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
```

#### Anatomy of a record

* Before encoding: `a.country. 3600 IN A 1.2.3.4`
* Encoded value: `016107636f756e747279000001000100000e10000401020304`
  * `016107636f756e74727900`: kecacak256 of dnsName
  * `0001000100000e100004`: other fields such as TTL and Record Type
  * `01020304`: value (IP Address)

Using RRIterator, records such as the above can be identified using offset in the iteration, and length-value of each record encoded as part of the data