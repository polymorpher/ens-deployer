import hre, { ethers } from 'hardhat'
import DeployENS from '../../deploy/ensDeployer'
import {
  USDOracleInterface,
  BaseRegistrarImplementation,
  ENSDeployer,
  ENSRegistry,
  FIFSRegistrar,
  IPriceOracle, Multicall3,
  OracleDeployer,
  PublicResolver,
  RegistrarController,
  ReverseRegistrar,
  TLDMetadataService,
  TLDNameWrapper,
  UniversalResolver
} from '../../typechain-types'
import { Context } from 'mocha'

export async function deploy (context: Context) {
  const addresses = await DeployENS(hre)
  context.oracleDeployer = await ethers.getContractAt('OracleDeployer', addresses.OracleDeployer) as OracleDeployer
  context.priceOracle = await ethers.getContractAt('IPriceOracle', addresses.priceOracle) as IPriceOracle
  context.usdOracle = await ethers.getContractAt('USDOracleInterface', addresses.usdOracle) as USDOracleInterface
  context.ensDeployer = await ethers.getContractAt('ENSDeployer', addresses.ENSDeployer) as ENSDeployer
  context.ens = await ethers.getContractAt('ENSRegistry', addresses.ENSRegistry) as ENSRegistry
  context.fifsRegistrar = await ethers.getContractAt('FIFSRegistrar', addresses.FIFSRegistrar) as FIFSRegistrar
  context.reverseRegistrar = await ethers.getContractAt('ReverseRegistrar', addresses.ReverseRegistrar) as ReverseRegistrar
  context.baseRegistrar = await ethers.getContractAt('BaseRegistrarImplementation', addresses.BaseRegistrarImplementation) as BaseRegistrarImplementation
  context.metadataService = await ethers.getContractAt('TLDMetadataService', addresses.MetadataService) as TLDMetadataService
  context.nameWrapper = await ethers.getContractAt('TLDNameWrapper', addresses.NameWrapper) as TLDNameWrapper
  context.registrarController = await ethers.getContractAt('RegistrarController', addresses.ETHRegistrarController) as RegistrarController
  context.publicResolver = await ethers.getContractAt('PublicResolver', addresses.PublicResolver) as PublicResolver
  context.universalResolver = await ethers.getContractAt('UniversalResolver', addresses.UniversalResolver) as UniversalResolver
  context.multicall = await ethers.getContractAt('Multicall3', addresses.Multicall) as Multicall3
}
