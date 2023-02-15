import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { dns } from '../lib'
import namehash from 'eth-ens-namehash'
import { LengthBasedPriceOracle, PublicResolver, RegistrarController } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const PUBLIC_RESOLVER = process.env.PUBLIC_RESOLVER as string
const REGISTRAR_CONTROLLER = process.env.REGISTRAR_CONTROLLER as string
const PRICE_ORACLE = process.env.PRICE_ORACLE as string

async function registerDomain (domain: string, owner: SignerWithAddress, ip: string) {
  const duration = ethers.BigNumber.from(28 * 24 * 3600)
  const secret = new Uint8Array(32).fill(0)
  const callData = []
  const reverseRecord = false
  const fuses = ethers.BigNumber.from(0)
  const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
  const registrarController: RegistrarController = await ethers.getContractAt('RegistrarController', REGISTRAR_CONTROLLER)
  const priceOracle: LengthBasedPriceOracle = await ethers.getContractAt('LengthBasedPriceOracle', PRICE_ORACLE)
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
    PUBLIC_RESOLVER,
    callData,
    reverseRecord,
    fuses,
    wrapperExpiry
  )
  let txr = await (await registrarController.connect(owner).commit(commitment)).wait()
  console.log('Commitment Stored', txr.transactionHash)
  txr = await (await registrarController.connect(owner).register(
    domain,
    owner.address,
    duration,
    secret,
    PUBLIC_RESOLVER,
    callData,
    reverseRecord,
    fuses,
    wrapperExpiry,
    {
      value: price.base.add(price.premium)
    }
  )).wait()
  console.log(`Registered: ${domain}`, txr.transactionHash)

  const publicResolver: PublicResolver = await ethers.getContractAt('PublicResolver', PUBLIC_RESOLVER)
  const TLD = process.env.TLD || 'country'
  const node = namehash.hash(domain + '.' + TLD)
  const FQDN = domain + '.' + TLD + '.'
  const [SldRecord] = dns.encodeARecord(FQDN, ip)
  const [SubdomainAARecord] = dns.encodeARecord('a.' + FQDN, ip)
  const [SubdomainOneCnameRecord] = dns.encodeCNAMERecord('one.' + FQDN, 'harmony.one')
  // Set Initial DNS entries
  const fullRecord = '0x' + SldRecord + SubdomainAARecord + SubdomainOneCnameRecord
  txr = await (await publicResolver.connect(owner).setDNSRecords(node, fullRecord)).wait()
  console.log(`setDNSRecords: ${txr.transactionHash}`)
  // Set initial zonehash
  txr = await (await publicResolver.connect(owner).setZonehash(
    node,
    '0x0000000000000000000000000000000000000000000000000000000000000001'
  )).wait()
  console.log(`Created records for: ${domain + '.' + TLD} and a.${FQDN} same ip address: ${ip}; tx ${txr.transactionHash}`)
}

const f = async function (hre: HardhatRuntimeEnvironment) {
  // Add some records for local testing (used by go-1ns, a CoreDNS plugin)
  if (hre.network.name !== 'local') {
    throw new Error('Should only deploy sample DNS registration in local network')
  }
  console.log(`about to registerDomain in network: ${hre.network.name}`)
  // The 10 signer accounts represent: deployer, operatorA, operatorB, operatorC, alice, bob, carol, ernie, dora
  const signers = await ethers.getSigners()
  const alice = signers[4]
  const bob = signers[5]

  // Set DEFAULT IP for zones
  const deployer = signers[0]
  const publicResolver: PublicResolver = await ethers.getContractAt('PublicResolver', process.env.PUBLIC_RESOLVER as string)
  const TLD = process.env.TLD || 'country'
  const defaultIp = process.env.DEFAULT_IP || '34.120.199.241'
  const [aRecord] = dns.encodeARecord(`*.${TLD}.`, defaultIp)
  await (await publicResolver.connect(deployer).setDNSRecords(namehash.hash(''), '0x' + aRecord)).wait()

  // Register Domains
  await registerDomain('test', alice, '128.0.0.1')
  await registerDomain('testa', alice, '128.0.0.2')
  await registerDomain('testb', bob, '128.0.0.3')
  await registerDomain('testlongdomain', bob, '128.0.0.1')
}

f.tags = ['ENSSampleDNS']
export default f
