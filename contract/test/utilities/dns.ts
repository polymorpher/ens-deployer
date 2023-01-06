import { packet } from 'dns-packet'

export function hexEncodeName (name) {
  return '0x' + packet.name.encode(name).toString('hex')
}

export function hexEncodeTXT (keys) {
  return '0x' + packet.answer.encode(keys).toString('hex')
}
