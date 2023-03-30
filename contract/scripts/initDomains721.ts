import { ethers } from 'hardhat'
import TLDBaseRegistrarImplementationAbi from '../abi/TLDBaseRegistrarImplementation.json'
import fs from 'fs/promises'

const BASE_REGISTRAR = process.env.BASE_REGISTRAR || '0xaC60e74e5906C60D96E2645387952e6a7DE224dc'
async function main () {
  const br = new ethers.Contract(BASE_REGISTRAR, TLDBaseRegistrarImplementationAbi)
  const records = await fs.readFile(process.env.INPUT_FILE as string, { encoding: 'utf-8' })
  const entries = records.split('\n').map(r => {
    const parts = r.split(' ')
    const name = parts[1].split('.')[0]
    const wallet = parts[0]
    return { name, wallet }
  })
  console.log(entries)
  const ids = entries.map(e => ethers.utils.id(e.name))
  const wallets = entries.map(e => e.wallet)
  const expires = new Array(ids.length).fill(1687112242)
  for (let i = 0; i < ids.length; i += 50) {
    const idChunk = ids.slice(i, Math.min(i + 50, ids.length))
    const namesChunk = entries.slice(i, Math.min(i + 50, wallets.length)).map(e => e.name)
    const walletChunk = wallets.slice(i, Math.min(i + 50, wallets.length))
    const expireChunk = expires.slice(i, Math.min(i + 50, expires.length))
    const data = br.interface.encodeFunctionData('initialize', [idChunk, walletChunk, expireChunk, true])
    console.log('names: ', namesChunk)
    console.log(`chunk ${i} to ${Math.min(i + 50, ids.length)}: `, data)
  }
}

main().catch(ex => console.error(ex))
