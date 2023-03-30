import { ethers } from 'hardhat'
import TLDNameWrapperAbi from '../abi/TLDNameWrapper.json'
import fs from 'fs/promises'
import assert from 'assert'
import { TLDNameWrapper } from '../typechain-types'

const NAME_WRAPPER = process.env.NAME_WRAPPER || '0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5'
const RESOLVER = process.env.RESOLVER || '0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D'
const FUSES = parseInt(process.env.FUSES || '0')
const EXPIRY = process.env.EXPIRY || ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
const INPUT_FILE = process.env.INPUT_FILE as string
async function main () {
  assert(!!INPUT_FILE, 'INPUT_FILE is missing')
  console.log({ NAME_WRAPPER, RESOLVER, INPUT_FILE, FUSES, EXPIRY })
  const nw = new ethers.Contract(NAME_WRAPPER, TLDNameWrapperAbi) as TLDNameWrapper
  const records = await fs.readFile(INPUT_FILE, { encoding: 'utf-8' })
  const entries = records.split('\n').map(r => {
    const parts = r.split(' ')
    const name = parts[1].split('.')[0]
    const wallet = parts[0]
    return { name, wallet }
  })
  console.log(entries)
  const labels = entries.map(e => e.name)
  const wallets = entries.map(e => e.wallet)
  const durations = new Array(labels.length).fill(3600 * 24 * 90)
  for (let i = 0; i < labels.length; i += 50) {
    const labelChunk = labels.slice(i, Math.min(i + 50, labels.length))
    const walletChunk = wallets.slice(i, Math.min(i + 50, wallets.length))
    const durationChunk = durations.slice(i, Math.min(i + 50, durations.length))
    const data = nw.interface.encodeFunctionData('initialize', [labelChunk, walletChunk, durationChunk, RESOLVER, FUSES, EXPIRY])
    console.log('labels: ', JSON.stringify(labels))
    console.log(`chunk ${i} to ${Math.min(i + 50, labels.length)}: `, data)
  }
}

main().catch(ex => console.error(ex))
