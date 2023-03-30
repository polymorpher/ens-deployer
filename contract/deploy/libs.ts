import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ENSDeployer, OracleDeployer, TLDBaseRegistrarImplementation, TLDNameWrapper } from '../typechain-types'
import { ethers } from 'hardhat'

export const deployLibs = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const ENSUtils = await deploy('ENSUtils', { from: deployer })
  const ENSRegistryDeployer = await deploy('ENSRegistryDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSNFTDeployer = await deploy('ENSNFTDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSControllerDeployer = await deploy('ENSControllerDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSPublicResolverDeployer = await deploy('ENSPublicResolverDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSUniversalResolverDeployer = await deploy('ENSUniversalResolverDeployer', { from: deployer })
  const MetadataServiceDeployer = await deploy('MetadataServiceDeployer', { from: deployer })
  const MulticallDeployer = await deploy('MulticallDeployer', { from: deployer })

  return {
    ENSUtils,
    ENSRegistryDeployer,
    ENSNFTDeployer,
    ENSControllerDeployer,
    ENSPublicResolverDeployer,
    ENSUniversalResolverDeployer,
    MetadataServiceDeployer,
    MulticallDeployer
  }
}

export const getDeployedAddresses = async function (hre: HardhatRuntimeEnvironment, ensDeployer: ENSDeployer, oracleDeployer: OracleDeployer): Promise<object> {
  const { getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  console.log('deployer account', deployer)
  console.log('ENSDeployer deployed to:', ensDeployer.address)
  console.log('- ens deployed to:', await ensDeployer.ens())
  console.log('- fifsRegistrar deployed to:', await ensDeployer.fifsRegistrar())
  console.log('- reverseRegistrar deployed to:', await ensDeployer.reverseRegistrar())
  const baseRegistrarAddress = await ensDeployer.baseRegistrar()
  console.log('- baseRegistrar deployed to:', await ensDeployer.baseRegistrar())
  const nameWrapperAddress = await ensDeployer.nameWrapper()
  const baseRegistrar = await ethers.getContractAt('TLDBaseRegistrarImplementation', baseRegistrarAddress) as TLDBaseRegistrarImplementation
  const nameWrapper = await ethers.getContractAt('TLDNameWrapper', nameWrapperAddress) as TLDNameWrapper
  console.log('- baseRegistrarMetadataService deployed to:', await baseRegistrar.metadataService())
  console.log('- nameWrapperMetadataService deployed to:', await nameWrapper.metadataService())
  console.log('- nameWrapper deployed to:', await ensDeployer.nameWrapper())
  console.log('- registrarController deployed to:', await ensDeployer.registrarController())
  console.log('- publicResolver deployed to:', await ensDeployer.publicResolver())
  console.log('- universalResolver deployed to:', await ensDeployer.universalResolver())
  const ens = await ethers.getContractAt('ENSRegistry', await ensDeployer.ens())
  console.log('ens owner:', await ens.owner(new Uint8Array(32)))
  const resolverNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('resolver'))]))
  const reverseRegNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('reverse'))]))
  console.log('resolver node owner:', await ens.owner(resolverNode))
  console.log('reverse registrar node owner:', await ens.owner(reverseRegNode))

  const addresses = {
    priceOracle: await oracleDeployer.oracle(),
    usdOracle: await oracleDeployer.usdOracle(),
    OracleDeployer: oracleDeployer.address,
    ENSDeployer: ensDeployer.address,
    ENSRegistry: await ens.address,
    BaseRegistrarMetadataService: await baseRegistrar.metadataService(),
    BaseRegistrarImplementation: await ensDeployer.baseRegistrar(),
    FIFSRegistrar: await ensDeployer.fifsRegistrar(),
    ReverseRegistrar: await ensDeployer.reverseRegistrar(),
    MetadataService: await ensDeployer.metadataService1155(),
    MetadataService721: await ensDeployer.metadataService721(),
    NameWrapper: await ensDeployer.nameWrapper(),
    ETHRegistrarController: await ensDeployer.registrarController(),
    PublicResolver: await ensDeployer.publicResolver(),
    UniversalResolver: await ensDeployer.universalResolver(),
    Multicall: await ensDeployer.multicall()
  }
  console.log(JSON.stringify(addresses))
  return addresses
}
