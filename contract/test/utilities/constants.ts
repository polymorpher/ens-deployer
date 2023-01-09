import { packet } from 'dns-packet'

export const Constants = {
  EMPTY_ADDRESS: '0x0000000000000000000000000000000000000000',
  EMPTY_BYTES32:
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  // DNSRecord Types from https://en.wikipedia.org/wiki/List_of_DNS_record_types
  DNSRecordType: {
    1: 'A',
    2: 'NS',
    A: 1,
    NS: 2,
    CNAME: 5,
    SOA: 6,
    PTR: 12,
    HINFO: 13,
    MX: 15,
    TXT: 16,
    RP: 17,
    AFSDB: 18,
    SIG: 24,
    KEY: 25,
    AAAA: 28,
    LOC: 29,
    SRV: 33,
    NAPTR: 35,
    KX: 36,
    CERT: 37,
    DNAME: 39,
    APL: 42,
    DS: 43,
    SSHFP: 44,
    IPSECKEY: 45,
    RRSIG: 46,
    NSEC: 47,
    DNSKEY: 48,
    DHCID: 49,
    NSEC3: 50,
    NSEC3PARAM: 51,
    TLSA: 52,
    SIMMEA: 53,
    HIP: 55,
    CDS: 59,
    CDNSKEY: 60,
    OPENGPKEY: 61,
    CSYNC: 62,
    ZONEMD: 63,
    SVCB: 64,
    HTTPS: 65,
    EUI48: 108,
    EUI64: 109,
    TKEY: 249,
    TSIG: 250,
    URI: 256,
    CAA: 257,
    TA: 32768,
    DLV: 32769
  },
  ENTRIES: {
    realEntries: [
      {
        name: '.',
        type: 'DS',
        class: 'IN',
        ttl: 3600,
        data: {
          keyTag: 19036,
          algorithm: 8,
          digestType: 2,
          digest: Buffer.from(
            '49AAC11D7B6F6446702E54A1607371607A1A41855200FD2CE1CDDE32F24E8FB5',
            'hex'
          )
        }
      },
      {
        name: '.',
        type: 'DS',
        klass: 'IN',
        ttl: 3600,
        data: {
          keyTag: 20326,
          algorithm: 8,
          digestType: 2,
          digest: Buffer.from(
            'E06D44B80B8F1D39A95C0B0D7C65D08458E880409BBC683457104237C7F8EC8D',
            'hex'
          )
        }
      }
    ],
    dummyEntry: {
      name: '.',
      type: 'DS',
      class: 'IN',
      ttl: 3600,
      data: {
        keyTag: 1278, // Empty body, flags == 0x0101, algorithm = 253, body = 0x0000
        algorithm: 253,
        digestType: 253,
        digest: Buffer.from('', 'hex')
      }
    },
    encode: anchors => {
      return (
        '0x' +
          anchors
            .map(anchor => {
              return packet.answer.encode(anchor).toString('hex')
            })
            .join('')
      )
    }
  }
}
