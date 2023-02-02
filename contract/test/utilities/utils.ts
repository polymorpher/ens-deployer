import { toAscii } from 'idna-uts46'
// import { Keccak } from 'keccak'
const createKeccakHash = require('keccak')

export const utils = {
  hexView: (bytes) => {
    return bytes && Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join('')
  },

  hexString: (bytes) => {
    return '0x' + utils.hexView(bytes)
  },

  hexToBytes: (hex, length, padRight) => {
    if (!hex) {
      return
    }
    length = length || hex.length / 2
    const ar = new Uint8Array(length)
    for (let i = 0; i < hex.length / 2; i += 1) {
      let j = i
      if (padRight) {
        j = length - hex.length + i
      }
      ar[j] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return ar
  },

  stringToBytes: str => {
    return new TextEncoder().encode(str)
  },

  // assume Buffer is poly-filled or loaded from https://github.com/feross/buffer
  // accepts string as well
  /**
   *
   * @param {string | Buffer} bytes
   * @returns {Uint8Array}
   */
  keccak: (bytes) => {
    const k = createKeccakHash('keccak256')
    // assume Buffer is poly-filled or loaded from https://github.com/feross/buffer
    const hash = k.update(Buffer.from(bytes)).digest()
    return new Uint8Array(hash)
  },

  hexStringToBytes: (hexStr, length) => {
    return hexStr.startsWith('0x') ? utils.hexToBytes(hexStr.slice(2), length) : utils.hexToBytes(hexStr, length)
  },

  bytesEqual: (b1, b2) => {
    if (b1.byteLength !== b2.byteLength) return false
    for (let i = 0; i < b1.byteLength; i++) {
      if (b1[i] !== b2[i]) return false
    }
    return true
  },

  bytesToHexString: (byteArray) => {
    let s = '0x'
    byteArray.forEach(function (byte) {
      s += ('0' + (byte & 0xFF).toString(16)).slice(-2)
    })
    return s
  },

  normalizeDomain: e => {
    return toAscii(e, { useStd3ASCII: true })
  },

  namehash: (name) => {
    name = utils.normalizeDomain(name)
    const parts = name.split('.')
    const empty = new Uint8Array(32)
    if (!name) {
      return empty
    }
    let hash = empty
    for (let i = parts.length - 1; i >= 0; i--) {
      const joined = new Uint8Array(64)
      joined.set(hash)
      joined.set(utils.keccak(parts[i]), 32)
      hash = utils.keccak(joined)
    }
    return hash
  },

  bytesConcat: (...args) => {
    let len = 0
    args.forEach(e => {
      len += e.length
    })
    const buf = new Uint8Array(len)
    let n = 0
    args.forEach(e => {
      buf.set(e, n)
      n += e.length
    })
    return buf
  },

  ethMessage: (message) => {
    return '\x19Ethereum Signed Message:\n' + message.length.toString() + message
  },

  // TODO: rewrite using BN to achieve 100% precision
  formatNumber: (number, maxPrecision) => {
    maxPrecision = maxPrecision || 4
    number = parseFloat(number)
    if (number < 10 ** (-maxPrecision)) {
      return '0'
    }
    const order = Math.ceil(Math.log10(Math.max(number, 1)))
    const digits = Math.max(0, maxPrecision - order)
    // https://www.jacklmoore.com/notes/rounding-in-javascript/
    const floored = Number(`${Math.floor(`${number}e+${digits}`)}e-${digits}`)
    return floored.toString()
  }
}
