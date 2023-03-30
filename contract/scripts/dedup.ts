import { ethers } from 'hardhat'
import TLDBaseRegistrarImplementationAbi from '../abi/TLDBaseRegistrarImplementation.json'
import fs from 'fs/promises'

async function main () {
  const records = await fs.readFile(process.env.INPUT1 as string, { encoding: 'utf-8' })
  const entries = records.split('\n').map(r => {
    const parts = r.split(' ')
    const domain = parts[1]
    const wallet = parts[0]
    return [domain, wallet]
  })
  const r1 = Object.fromEntries(entries)
  console.log(r1)
  const records2 = await fs.readFile(process.env.INPUT2 as string, { encoding: 'utf-8' })
  const entries2 = records2.split('\n').map(r => {
    const parts = r.split(' ')
    const domain = parts[1]
    const wallet = parts[0]
    return { domain, wallet }
  })
  const diff = entries2.filter(({ domain, wallet }) => !r1[domain])
  const printout = diff.map(({ domain, wallet }) => `${wallet} ${domain} `).join('\n')
  console.log(printout)
  await fs.writeFile(process.env.OUT as string, printout, { encoding: 'utf-8' })
}

main().catch(ex => console.error(ex))
