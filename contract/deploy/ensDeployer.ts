import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers, network } from 'hardhat'
import { BufferConsumer, BufferWriter, DNSRecord } from 'dns-js'
import { PublicResolver } from '../typechain'
const namehash = require('eth-ens-namehash')

const ORACLE_PRICE_NATIVE_ASSET_NANO_USD = process.env.ORACLE_PRICE_NATIVE_ASSET_NANO_USD || '100000000000'
const ORACLE_PRICE_BASE_UNIT_PRICE = process.env.ORACLE_PRICE_BASE_UNIT_PRICE || '32'
const ORACLE_PRICE_PREMIUM = JSON.parse(process.env.ORACLE_PRICE_PREMIUM || '{}')

console.log({ ORACLE_PRICE_NATIVE_ASSET_NANO_USD, ORACLE_PRICE_BASE_UNIT_PRICE, ORACLE_PRICE_PREMIUM })

const f = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const TLD = process.env.TLD || 'country'
  const OracleDeployer = await deploy('OracleDeployer', {
    from: deployer,
    args: [
      ORACLE_PRICE_NATIVE_ASSET_NANO_USD,
      ORACLE_PRICE_BASE_UNIT_PRICE,
      Object.keys(ORACLE_PRICE_PREMIUM),
      Object.values(ORACLE_PRICE_PREMIUM)
    ]
  })
  const oracleDeployer = await ethers.getContractAt('OracleDeployer', OracleDeployer.address)
  const priceOracle = await oracleDeployer.oracle()
  console.log('oracleDeployer:', oracleDeployer.address)
  console.log('- priceOracle:', priceOracle)
  console.log('- usdOracle:', await oracleDeployer.usdOracle())
  const ENSUtils = await deploy('ENSUtils', { from: deployer })
  const ENSRegistryDeployer = await deploy('ENSRegistryDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSNFTDeployer = await deploy('ENSNFTDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSControllerDeployer = await deploy('ENSControllerDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSPublicResolverDeployer = await deploy('ENSPublicResolverDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSDeployer = await deploy('ENSDeployer', {
    from: deployer,
    args: [TLD, priceOracle],
    log: true,
    autoMine: true,
    libraries: {
      ENSUtils: ENSUtils.address,
      ENSRegistryDeployer: ENSRegistryDeployer.address,
      ENSNFTDeployer: ENSNFTDeployer.address,
      ENSControllerDeployer: ENSControllerDeployer.address,
      ENSPublicResolverDeployer: ENSPublicResolverDeployer.address
    }
  })
  const ensDeployer = await ethers.getContractAt('ENSDeployer', ENSDeployer.address)
  console.log('deployer account', deployer)
  console.log('ENSDeployer deployed to:', ensDeployer.address)
  console.log('- ens deployed to:', await ensDeployer.ens())
  console.log('- fifsRegistrar deployed to:', await ensDeployer.fifsRegistrar())
  console.log('- reverseRegistrar deployed to:', await ensDeployer.reverseRegistrar())
  console.log('- baseRegistrar deployed to:', await ensDeployer.baseRegistrar())

  console.log('- metadataService deployed to:', await ensDeployer.metadataService())
  console.log('- nameWrapper deployed to:', await ensDeployer.nameWrapper())

  console.log('- registrarController deployed to:', await ensDeployer.registrarController())

  console.log('- publicResolver deployed to:', await ensDeployer.publicResolver())

  console.log('- universalResolver deployed to:', await ensDeployer.universalResolver())

  const receipt = await ensDeployer.transferOwner(TLD, deployer).then(tx => tx.wait())
  console.log('tx', receipt.transactionHash)
  const ens = await ethers.getContractAt('ENSRegistry', await ensDeployer.ens())
  console.log('ens owner:', await ens.owner(new Uint8Array(32)))
  const resolverNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('resolver'))]))
  const reverseRegNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('reverse'))]))
  console.log('resolver node owner:', await ens.owner(resolverNode))
  console.log('reverse registrar node owner:', await ens.owner(reverseRegNode))

  const Multicall = await deploy('Multicall3', { from: deployer })

  console.log('NEXT_PUBLIC_DEPLOYMENT_ADDRESSES=\'' + JSON.stringify({
    ENSRegistry: await ens.address,
    BaseRegistrarImplementation: await ensDeployer.baseRegistrar(),
    FIFSRegistrar: await ensDeployer.fifsRegistrar(),
    ReverseRegistrar: await ensDeployer.reverseRegistrar(),
    MetadataService: await ensDeployer.metadataService(),
    NameWrapper: await ensDeployer.nameWrapper(),
    ETHRegistrarController: await ensDeployer.registrarController(),
    PublicResolver: await ensDeployer.publicResolver(),
    UniversalResolver: await ensDeployer.universalResolver(),
    Multicall: await Multicall.address
  }) + '\'')
  // Additional configuration data
  //   const receipt = await ensDeployer.transferOwner(deployer).then(tx => tx.wait())
  //   console.log('tx', receipt.transactionHash)
  //   await ens.Resolver(namehash.hash('resolver'))
  console.log(`namehash.hash('resolver'): ${namehash.hash('resolver')}`)
  console.log(`resolver.resolver: ${await ens.resolver(namehash.hash('resolver'))} `)

  // Add some records for local testing (used by go-1ns)
  if (hre.network.name === 'local') {
    console.log(`about to registerDomain in network: ${hre.network.name}`)
    // Note we pass a signer object in and use owner.address in the registration calls
    // We have set up local to use 10 accounts from a mnemonic
    // Logically the 10 accounts represent, deployer, operatorA, operatorB, operatorC, alice, bob, carol, ernie, dora
    const signers = await hre.ethers.getSigners()
    const alice = signers[4]
    console.log(`alice.address: ${alice.address}`)
    const bob = signers[5]
    await registerDomain('test', alice, '128.0.0.1', await ensDeployer.publicResolver(), await ensDeployer.registrarController())
    await registerDomain('testa', alice, '128.0.0.2', await ensDeployer.publicResolver(), await ensDeployer.registrarController())
    await registerDomain('testb', bob, '128.0.0.3', await ensDeployer.publicResolver(), await ensDeployer.registrarController())
  }
}
f.tags = ['ENSDeployer']
export default f

async function registerDomain (domain, owner, ip, resolverAddress, registrarControllerAddress) {
//   console.log('in register domain')
//   console.log(`owner: ${JSON.stringify(owner)}`)
//   console.log(`owner.address: ${JSON.stringify(owner.address)}`)
  const ONE_ETH = ethers.utils.parseEther('1')
  const duration = ethers.BigNumber.from(365 * 24 * 3600)
  const secret = '0x0000000000000000000000000000000000000000000000000000000000000000'
  const callData = []
  const reverseRecord = false
  const fuses = ethers.BigNumber.from(0)
  const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
  const registrarController = await ethers.getContractAt('RegistrarController', registrarControllerAddress)
  // const price = await this.priceOracle.price(node, 0, duration)
  // console.log(`price  : ${JSON.stringify(price.toString())}`)
  // console.log(`ONE_ETH: ${JSON.stringify(ONE_ETH.mul(1100).toString())}`)
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
      value: ONE_ETH.mul(1100)
    }
  )
  await tx.wait()
  console.log(`Registered: ${domain}`)

  // Also set a default A record
  const publicResolver = await ethers.getContractAt('PublicResolver', resolverAddress)
  const TLD = process.env.TLD || 'country'
  const node = namehash.hash(domain + '.' + TLD)
  console.log('==================')
  //   const initRecDomain = encodeARecord(domain, ip)
  //   const aName = 'a.' + domain
  //   const initRecA = encodeARecord(aName, ip)
  //   const initRec = '0x' + initRecDomain + initRecA
  const FQDN = domain + '.' + TLD + '.'
  //   const initRecDomainFQDN = encodeARecord(FQDN, ip)
  const aNameFQDN = 'a.' + FQDN
  const initRecAFQDN = encodeARecord(aNameFQDN, ip)
  const initRec = '0x' + initRecAFQDN
  //   const initRec = '0x' + initRecDomain + initRecA + initRecDomainFQDN + initRecAFQDN
  // Set Initial DNS entries
  console.log(`node: ${node}`)
  console.log(`initRec: ${initRec}`)
  tx = await publicResolver.connect(owner).setDNSRecords(node, initRec)
  await tx.wait()
  // Set intial zonehash
  tx = await publicResolver.connect(owner).setZonehash(
    node,
    '0x0000000000000000000000000000000000000000000000000000000000000001'
  )
  await tx.wait()
  console.log(`Created records for: ${domain + '.' + TLD} and ${aNameFQDN} same ip address: ${ip}`)
  console.log('==================')
}

export function encodeARecord (recName, recAddress) {
  // Sample Mapping
  // a.test.country. 3600 IN A 1.2.3.4
  /*
      name: a.test.country.
      type: A
      class: IN
      ttl: 3600
      address: 1.2.3.4
    */
  // returns 0161047465737407636f756e747279000001000100000e10000401020304

  // a empty address is used to remove existing records
  let rec = {}
  rec = {
    name: recName,
    type: DNSRecord.Type.A,
    class: DNSRecord.Class.IN,
    ttl: 3600,
    address: recAddress
  }
  const bw = new BufferWriter()
  const b = DNSRecord.write(bw, rec).dump()
  console.log(`b.json: ${JSON.stringify(b)}`)
  console.log(`recordText: ${b.toString('hex')}`)
  return b.toString('hex')
}
