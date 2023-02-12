import hre, { ethers } from 'hardhat'
import DeployENS from '../../deploy/ensDeployer'
import {
  AggregatorInterface,
  BaseRegistrarImplementation,
  ENSDeployer,
  ENSRegistry,
  FIFSRegistrar,
  IPriceOracle, Multicall3,
  OracleDeployer,
  PublicResolver,
  RegistrarController,
  ReverseRegistrar,
  StaticMetadataService,
  TLDNameWrapper,
  UniversalResolver
} from '../../typechain'
import { Context } from 'mocha'

interface TestContext extends Context {
  oracleDeployer?: OracleDeployer;
  priceOracle?: IPriceOracle;
  usdOracle?: AggregatorInterface;
  ensDeployer?: ENSDeployer;
  ens?: ENSRegistry;
  fifsRegistrar?: FIFSRegistrar;
  reverseRegistrar?: ReverseRegistrar;
  baseRegistrar?: BaseRegistrarImplementation;
  metadataService?: StaticMetadataService;
  nameWrapper?: TLDNameWrapper;
  registrarController?: RegistrarController;
  publicResolver?: PublicResolver;
  universalResolver?: UniversalResolver;
  multicall?: Multicall3;
}

export async function deploy (context: TestContext) {
  const addresses = await DeployENS(hre)
  context.oracleDeployer = await ethers.getContractAt('OracleDeployer', addresses.OracleDeployer) as OracleDeployer
  context.priceOracle = await ethers.getContractAt('IPriceOracle', addresses.priceOracle) as IPriceOracle
  context.usdOracle = await ethers.getContractAt('AggregatorInterface', addresses.usdOracle) as AggregatorInterface
  context.ensDeployer = await ethers.getContractAt('ENSDeployer', addresses.ENSDeployer) as ENSDeployer
  context.ens = await ethers.getContractAt('ENSRegistry', addresses.ENSRegistry) as ENSRegistry
  context.fifsRegistrar = await ethers.getContractAt('FIFSRegistrar', addresses.FIFSRegistrar) as FIFSRegistrar
  context.reverseRegistrar = await ethers.getContractAt('ReverseRegistrar', addresses.ReverseRegistrar) as ReverseRegistrar
  context.baseRegistrar = await ethers.getContractAt('BaseRegistrarImplementation', addresses.BaseRegistrarImplementation) as BaseRegistrarImplementation
  context.metadataService = await ethers.getContractAt('StaticMetadataService', addresses.MetadataService) as StaticMetadataService
  context.nameWrapper = await ethers.getContractAt('TLDNameWrapper', addresses.NameWrapper) as TLDNameWrapper
  context.registrarController = await ethers.getContractAt('RegistrarController', addresses.ETHRegistrarController) as RegistrarController
  context.publicResolver = await ethers.getContractAt('PublicResolver', addresses.PublicResolver) as PublicResolver
  context.universalResolver = await ethers.getContractAt('UniversalResolver', addresses.UniversalResolver) as UniversalResolver
  context.multicall = await ethers.getContractAt('Multicall3', addresses.Multicall) as Multicall3

  console.log('ens owner:', await context.ens.owner(new Uint8Array(32)))
  const resolverNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('resolver'))]))
  const reverseRegNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('reverse'))]))
  console.log('resolver node owner:', await context.ens.owner(resolverNode))
  console.log('reverse registrar node owner:', await context.ens.owner(reverseRegNode))
}
