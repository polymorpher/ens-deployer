import { packet } from 'dns-packet'
import { ethers } from 'hardhat'
import { Constants, utils } from '../utilities'
// import { namehash } from 'eth-ens-namehash'
const namehash = require('eth-ens-namehash')

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
