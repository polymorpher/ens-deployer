

## Testing
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




## User Overview




## DNS Record Mapping

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

