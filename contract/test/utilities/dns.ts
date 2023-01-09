import { packet, encode, decode } from 'dns-packet'
import { ethers } from 'hardhat'
import { Constants, utils } from '../utilities'
// import { namehash } from 'eth-ens-namehash'
const namehash = require('eth-ens-namehash')

export const records = [
  {
    name: 'www.test.country.',
    type: 'A',
    ttl: 3600,
    data: '127.0.0.1' // fx 127.0.0.1
  },
  {
    created: '2019-09-18T16:32:16.510368Z',
    domain: 'test.country',
    subname: 'www',
    name: 'www.test.country.',
    type: 'A',
    records: [
      '127.0.0.1',
      '127.0.0.2'
    ],
    ttl: 3600,
    touched: '2020-04-06T09:24:09.987436Z'
  }
]

export function hexEncodeName (name) {
  return '0x' + packet.name.encode(name).toString('hex')
}

export function hexEncodeTXT (keys) {
  return '0x' + packet.answer.encode(keys).toString('hex')
}

export function displayNode (node) {
  console.log(`node                : ${node}`)
  console.log(`node.dns.namehash   : ${namehash.hash(node)}`)
  console.log(`node.label.k256.b   : ${ethers.utils.keccak256(ethers.utils.toUtf8Bytes(node))}`)
  console.log(`node.utils.namehash : ${utils.utils.namehash(node)}`)
  console.log(`node.utils.namehashS: ${utils.utils.bytesToHexString(utils.utils.namehash(node))}`)
  console.log(`node.toUtfBytes     : ${ethers.utils.toUtf8Bytes(node)}`)
  console.log(`node.dnsName        : ${dnsName(node)}`)
  // TLD_NODE = keccak256(bytes.concat(bytes32(0), keccak256(bytes(_tld))));
  // console.log(`node.namehash0  : ${ethers.utils.keccak256(ethers.utils.concat(Constants.EMPTY_BYTES32, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(node)));
  //   console.log(`node.keccak256: ${ethers.utils.keccak256(node)}`)
}

export function makeNode (parent, child) {
  const parentHash = namehash.hash(parent)
  const childK256 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(child))
  return ethers.utils.keccak256(ethers.utils.concat([parentHash, childK256]))
}

export function dnsName (name) {
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
  return (
    '0x' +
        buf.reduce(
          (output, elem) => output + ('0' + elem.toString(16)).slice(-2),
          ''
        )
  )
}

export function encodeRecords (records) {
  const buf = encode(records[0])
  console.log(`records: ${JSON.stringify(records)}`)
  console.log(`buf: ${JSON.stringify(buf)}`)
  console.log(`bufDecode: ${JSON.stringify(decode(buf))}`)
  return records
}
