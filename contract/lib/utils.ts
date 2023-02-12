import { toAscii } from 'idna-uts46'
import { createKeccakHash } from 'keccak'

export const utils = {
  keccak: (bytes) => {
    const k = createKeccakHash('keccak256')
    // assume Buffer is poly-filled or loaded from https://github.com/feross/buffer
    const hash = k.update(Buffer.from(bytes)).digest()
    return new Uint8Array(hash)
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
  }
}
