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
} from '../typechain-types'
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

export interface SRVRecordValue {
    priority: number
    weight: number
    port: number
    target: string
  }

// TODO: define members of object for each type of record
export type EncodedRecord = [string, Buffer, object]

export interface ARecord {
    name: string;
    ipAddress: string;
  }

export interface CNAMERecord {
    name: string;
    cname: string;
  }

export interface DNAMERecord {
    name: string;
    dname: string;
  }

export interface NSRecord {
    name: string;
    nsname: string;
  }

export interface SOARecord {
    name: string;
    rvalue: SOARecordValue;
  }

export interface SRVRecord {
    name: string;
    rvalue: SRVRecordValue;
  }

export interface TXTRecord {
    name: string;
    text: string;
  }
