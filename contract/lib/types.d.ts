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
  StaticMetadataService,
  TLDNameWrapper,
  UniversalResolver
} from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

declare module 'mocha' {
    export interface Context {
        oracleDeployer: OracleDeployer
        priceOracle: IPriceOracle
        usdOracle: USDOracleInterface
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

export interface SOARecordValue {
    primary: string
    admin: string
    serial: number
    refresh: number
    retry: number
    expiration: number
    minimum: number
  }
  // TODO: define members of object for each type of record
export type EncodedRecord = {
    hexString: string,
    buffer: Buffer,
    record: object
  }

export type ARecord = {
    name: string;
    ipAddress: string;
  }

export type CNAMERecord = {
    name: string;
    cname: string;
  }

export type SOARecord = {
    name: string;
    rvalue: SOARecordValue;
  }

export type TXTRecord = {
    name: string;
    text: string;
  }
