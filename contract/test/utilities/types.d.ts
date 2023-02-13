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
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

declare module 'mocha' {
    export interface Context {
        oracleDeployer: OracleDeployer
        priceOracle: IPriceOracle
        usdOracle: AggregatorInterface
        ensDeployer: ENSDeployer
        ens: ENSRegistry
        fifsRegistrar: FIFSRegistrar
        reverseRegistrar: ReverseRegistrar
        baseRegistrar: BaseRegistrarImplementation
        metadataService: StaticMetadataService
        nameWrapper: TLDNameWrapper
        registrarController: RegistrarController
        publicResolver: PublicResolver
        universalResolver: UniversalResolver
        multicall: Multicall3

        signers: SignerWithAddress[]
        deployer: SignerWithAddress
        operatorA: SignerWithAddress
        operatorB: SignerWithAddress
        operatorC: SignerWithAddress
        alice: SignerWithAddress
        bob: SignerWithAddress
        carol: SignerWithAddress
        dora : SignerWithAddress
        ernie: SignerWithAddress
    }
}
