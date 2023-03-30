import { ethers } from 'hardhat'
import TLDBaseRegistrarImplementationAbi from '../abi/TLDBaseRegistrarImplementation.json'
import fs from 'fs/promises'

const BASE_REGISTRAR = process.env.BASE_REGISTRAR || '0xaC60e74e5906C60D96E2645387952e6a7DE224dc'
async function main () {
  const br = new ethers.Contract(BASE_REGISTRAR, TLDBaseRegistrarImplementationAbi)
  const records = await fs.readFile(process.env.INPUT_FILE as string, { encoding: 'utf-8' })
  const names = records.split('\n')
  console.log(names)
  const ids = names.map(e => ethers.utils.id(e))
  const wallets = names.map(() => '0x000000000000000000000000000000000000dead')
  const expires = new Array(ids.length).fill(0)
  for (let i = 0; i < ids.length; i += 50) {
    const idChunk = ids.slice(i, Math.min(i + 50, ids.length))
    const namesChunk = names.slice(i, Math.min(i + 50, wallets.length))
    const walletChunk = wallets.slice(i, Math.min(i + 50, wallets.length))
    const expireChunk = expires.slice(i, Math.min(i + 50, expires.length))
    const data = br.interface.encodeFunctionData('initialize', [idChunk, walletChunk, expireChunk, true])
    console.log('names: ', namesChunk)
    console.log(`chunk ${i} to ${Math.min(i + 50, ids.length)}: `, data)
  }
}

main().catch(ex => console.error(ex))
