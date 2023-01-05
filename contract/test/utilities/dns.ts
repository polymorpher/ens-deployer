import { packet } from 'dns-packet'

function hexEncodeName (name) {
  return '0x' + packet.name.encode(name).toString('hex')
}

function hexEncodeTXT (keys) {
  return '0x' + packet.answer.encode(keys).toString('hex')
}

module.exports = {
  hexEncodeName,
  hexEncodeTXT
}
