import { DNSRecord } from 'dns-js'
import BufferWriter from 'dns-js/lib/bufferwriter'
import type { EncodedRecord, ARecord, CNAMERecord, DNAMERecord, NSRecord, SOARecord, SRVRecord, TXTRecord } from './types.d'

// name is a FQDN with or without trailing dot
// output is the encoding per RFC1035 https://www.ietf.org/rfc/rfc1035.txt
export const dnsName = (name: string) => {
  // strip leading and trailing .
  const n = name.replace(/^\.|\.$/gm, '')

  const bufLen = n === '' ? 1 : n.length + 2
  const buf = Buffer.allocUnsafe(bufLen)

  let offset = 0
  if (n.length) {
    const list = n.split('.')
    for (let i = 0; i < list.length; i++) {
      const len = buf.write(list[i], offset + 1)
      buf[offset] = len
      offset += len + 1
    }
  }
  buf[offset++] = 0
  return '0x' + buf.toString('hex')
}

export const debugPrintRecord = (record: object, bufferWriter: Buffer) => {
  console.log(`rec: ${JSON.stringify(record)}`)
  console.log(`b.json: ${JSON.stringify(bufferWriter)}`)
  console.log(`b.string: ${bufferWriter.toString()}`)
  console.log(`recordText: ${bufferWriter.toString('hex')}`)
}

export const encodeRecord = (record: object): EncodedRecord => {
  const buffer = DNSRecord.write(new BufferWriter(), record).dump() as Buffer
  return [buffer.toString('hex'), buffer, record]
}

// TODO: buggy for empty ipAddress. Must fix later
export const encodeARecord = (aRecord: ARecord): EncodedRecord => {
  // Sample Mapping
  // a.test.country. 3600 IN A 1.2.3.4
  /*
    name: a.test.country
    type: A
    class: IN
    ttl: 3600
    address: 1.2.3.4
  */
  // returns 0161047465737407636f756e747279000001000100000e10000401020304

  // a empty address is used to remove existing records
  return encodeRecord({
    name: aRecord.name,
    type: DNSRecord.Type.A,
    class: DNSRecord.Class.IN,
    ttl: 3600,
    address: aRecord.ipAddress
  })
}

export const encodeCNAMERecord = (cnameRecord: CNAMERecord): EncodedRecord => {
  // Sample Mapping
  // a.test.country. 3600 IN CNAME harmony.one
  /*
    name: a.test.country
    type: CNAME
    class: IN
    ttl: 3600
    data: harmony.one
  */
  // returns 036f6e65047465737407636f756e747279000005000100000e10000d076861726d6f6e79036f6e6500

  // a empty address is used to remove existing records
  return encodeRecord({
    name: cnameRecord.name,
    type: DNSRecord.Type.CNAME,
    class: DNSRecord.Class.IN,
    ttl: 3600,
    data: cnameRecord.cname
  })
}

export const encodeDNAMERecord = (dnameRecord: DNAMERecord): EncodedRecord => {
  // Sample Mapping
  // docs.test.country. 3600 IN CNAME docs.harmony.one
  /*
      name: a.test.country
      type: CNAME
      class: IN
      ttl: 3600
      data: harmony.one
    */
  // returns 04646f6373047465737407636f756e747279000027000100000e10001204646f6373076861726d6f6e79036f6e6500

  // a empty address is used to remove existing records
  return encodeRecord({
    name: dnameRecord.name,
    type: DNSRecord.Type.DNAME,
    class: DNSRecord.Class.IN,
    ttl: 3600,
    data: dnameRecord.dname
  })
}

export const encodeNSRecord = (nsnameRecord: NSRecord): EncodedRecord => {
  // Sample Mapping
  // country. 3600 IN NS ns3.hiddenstate.xyz
  /*
        name: country.
        type: CNAME
        class: IN
        ttl: 3600
        data: ns3.hiddenstate.xyz
      */
  // returns 07636f756e747279000027000100000e100015036e73330b68696464656e73746174650378797a00

  // a empty address is used to remove existing records
  return encodeRecord({
    name: nsnameRecord.name,
    type: DNSRecord.Type.NS,
    class: DNSRecord.Class.IN,
    ttl: 3600,
    data: nsnameRecord.nsname
  })
}

export const encodeSOARecord = (soaRecord: SOARecord): EncodedRecord => {
  // Sample Mapping
  // test.country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
  /*
   name: test.country.
   ttL: 86400
   class: IN
   type: SOA
   primary: ns1.countrydns.xyz.
   admin: hostmaster.test.country.
   serial: 2018061501
   refresh: 15620
   retry: 1800
   expiration: 1814400
   minimum: 14400
  */
  // returns  047465737407636f756e747279000006000100000000003a036e73310a636f756e747279646e730378797a000a686f73746d61737465720474657374c00578492cbd00003d0400000708001baf8000003840
  return encodeRecord({
    name: soaRecord.name,
    ttL: 86400,
    type: DNSRecord.Type.SOA,
    class: DNSRecord.Class.IN,
    ...soaRecord.rvalue
  })
}

export const encodeSRVRecord = (srvRecord: SRVRecord): EncodedRecord => {
  // Sample Mapping
  // srv    IN SRV 10 10 8080 srv.test.country.
  /*
    name: srv
    class: IN
    type: SRV
    priority: 10,
    weight: 10,
    port: 8080,
    target: 'srv.test.country.'
    */
  // returns  037372760000210001000000000018000a000a1f9003737276047465737407636f756e74727900
  return encodeRecord({
    name: srvRecord.name,
    ttL: 86400,
    type: DNSRecord.Type.SRV,
    class: DNSRecord.Class.IN,
    ...srvRecord.rvalue
  })
}

export const encodeTXTRecord = (txtRecord: TXTRecord): EncodedRecord => {
  // Sample Mapping
  // test.country. SampleText
  /*
    name:  test.country.
    data: SampleText
    */
  // returns
  return encodeRecord({
    name: txtRecord.name,
    type: DNSRecord.Type.TXT,
    class: DNSRecord.Class.IN,
    data: txtRecord.text
  })
}
