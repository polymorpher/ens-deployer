import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { dns } from '../lib'
const namehash = require('eth-ens-namehash')

const f = async function (hre: HardhatRuntimeEnvironment) {
  // Add some records for local testing (used by go-1ns)
  if (hre.network.name === 'local') {
    console.log(`about to registerDomain in network: ${hre.network.name}`)
    // Note we pass a signer object in and use owner.address in the registration calls
    // We have set up local to use 10 accounts from a mnemonic
    // Logically the 10 accounts represent, deployer, operatorA, operatorB, operatorC, alice, bob, carol, ernie, dora
    const signers = await ethers.getSigners()
    const alice = signers[4]
    console.log(`alice.address: ${alice.address}`)
    const bob = signers[5]

    // Set DEFAULT IP for zones
    const deployer = signers[0]
    const publicResolver = await ethers.getContractAt('PublicResolver', process.env.PUBLIC_RESOLVER)
    const TLD = process.env.TLD || 'country'
    const TLDnode = namehash.hash('')
    const FQTLD = TLD + '.'
    const wildFQTLD = '*.' + FQTLD
    const defaultIP = process.env.DEFAULT_IP || '34.120.199.241'
    const initRecAFQDN = dns.encodeARecord(wildFQTLD, defaultIP)
    const initRec = '0x' + initRecAFQDN
    const tx = await publicResolver.connect(deployer).setDNSRecords(TLDnode, initRec)
    await tx.wait()

    // Register Domains
    await registerDomain('test', alice, '128.0.0.1', process.env.PUBLIC_RESOLVER, process.env.REGISTRAR_CONTROLLER)
    await registerDomain('testa', alice, '128.0.0.2', process.env.PUBLIC_RESOLVER, process.env.REGISTRAR_CONTROLLER)
    await registerDomain('testb', bob, '128.0.0.3', process.env.PUBLIC_RESOLVER, process.env.REGISTRAR_CONTROLLER)
    await registerDomain('testlongdomain', bob, '128.0.0.1', process.env.PUBLIC_RESOLVER, process.env.REGISTRAR_CONTROLLER)
  }
}
f.tags = ['ENSSampleDomain']
export default f

async function registerDomain (domain, owner, ip, resolverAddress, registrarControllerAddress) {
  const duration = ethers.BigNumber.from(28 * 24 * 3600)
  const secret = '0x0000000000000000000000000000000000000000000000000000000000000000'
  const callData = []
  const reverseRecord = false
  const fuses = ethers.BigNumber.from(0)
  const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
  const registrarController = await ethers.getContractAt('RegistrarController', registrarControllerAddress)
  const priceOracle = await ethers.getContractAt('LengthBasedPriceOracle', process.env.PRICE_ORACLE)
  const price = await priceOracle.price(domain, 0, duration)
  console.log(`registering domain: ${domain}`)
  console.log(`price          : ${JSON.stringify(price.toString())}`)
  console.log(`price.base     : ${ethers.utils.formatEther(price.base)}`)
  console.log(`price.premium  : ${ethers.utils.formatEther(price.premium)}`)
  const commitment = await registrarController.connect(owner).makeCommitment(
    domain,
    owner.address,
    duration,
    secret,
    resolverAddress,
    callData,
    reverseRecord,
    fuses,
    wrapperExpiry
  )
  let tx = await registrarController.connect(owner).commit(commitment)
  await tx.wait()
  console.log('Commitment Stored')
  tx = await registrarController.connect(owner).register(
    domain,
    owner.address,
    duration,
    secret,
    resolverAddress,
    callData,
    reverseRecord,
    fuses,
    wrapperExpiry,
    {
      value: price.base.add(price.premium)
    }
  )
  await tx.wait()
  console.log(`Registered: ${domain}`)

  // Set default A records for domain and a.domain
  const publicResolver = await ethers.getContractAt('PublicResolver', resolverAddress)
  const TLD = process.env.TLD || 'country'
  const node = namehash.hash(domain + '.' + TLD)
  const FQDN = domain + '.' + TLD + '.'
  const initRecFQDN = dns.encodeARecord(FQDN, ip)
  const aNameFQDN = 'a.' + FQDN
  const initRecAFQDN = dns.encodeARecord(aNameFQDN, ip)
  // Set CNAME Record for one.domain
  const oneNameFQDN = 'one.' + FQDN
  const initRecCNAMEFQDN = dns.encodeCNAMERecord(oneNameFQDN, 'harmony.one')
  // Set Initial DNS entries
  const initRec = '0x' + initRecFQDN + initRecAFQDN + initRecCNAMEFQDN
  tx = await publicResolver.connect(owner).setDNSRecords(node, initRec)
  await tx.wait()
  // Set intial zonehash
  tx = await publicResolver.connect(owner).setZonehash(
    node,
    '0x0000000000000000000000000000000000000000000000000000000000000001'
  )
  await tx.wait()
  console.log(`Created records for: ${domain + '.' + TLD} and ${aNameFQDN} same ip address: ${ip}`)
}
