import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { ENSDeployer } from '../typechain-types'
import assert from 'assert'
import deployOracle from './oracle'
import { deployLibs, getDeployedAddresses } from './libs'

const REVENUE_ACCOUNT = process.env.REVENUE_ACCOUNT as string
const MULTISIG_ACCOUNT = process.env.MULTISIG_ACCOUNT as string
const METADATA_BASE_URL = process.env.METADATA_BASE_URL as string

const keypress = async () => {
  return new Promise(resolve => process.stdin.once('data', () => {
    resolve(null)
  }))
}

const deployDeployerForMultisig = async function (hre: HardhatRuntimeEnvironment) {
  console.log({ REVENUE_ACCOUNT, MULTISIG_ACCOUNT })
  assert(ethers.utils.isAddress(REVENUE_ACCOUNT), 'Invalid Revenue Account')
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const TLD = process.env.TLD || 'country'
  const oracleDeployer = await deployOracle(hre)
  const { ENSUtils, ENSRegistryDeployer, ENSNFTDeployer, ENSControllerDeployer, ENSPublicResolverDeployer, ENSUniversalResolverDeployer, MetadataServiceDeployer, MulticallDeployer } = await deployLibs(hre)
  const ENSDeployer = await deploy('ENSDeployer', {
    from: deployer,
    args: [MULTISIG_ACCOUNT],
    log: true,
    libraries: {
      ENSUtils: ENSUtils.address,
      ENSRegistryDeployer: ENSRegistryDeployer.address,
      ENSNFTDeployer: ENSNFTDeployer.address,
      ENSControllerDeployer: ENSControllerDeployer.address,
      ENSPublicResolverDeployer: ENSPublicResolverDeployer.address,
      ENSUniversalResolverDeployer: ENSUniversalResolverDeployer.address,
      MetadataServiceDeployer: MetadataServiceDeployer.address,
      MulticallDeployer: MulticallDeployer.address
    }
  })
  const priceOracle = await oracleDeployer.oracle()
  const ensDeployer = await ethers.getContractAt('ENSDeployer', ENSDeployer.address) as ENSDeployer
  const deployCalldata = ensDeployer.interface.encodeFunctionData('deploy', [priceOracle, REVENUE_ACCOUNT, TLD, METADATA_BASE_URL])
  const transferOwnerCalldata = ensDeployer.interface.encodeFunctionData('transferOwner', [MULTISIG_ACCOUNT])
  console.log('deployer account', deployer)
  console.log(`ENSDeployer owner: ${await ensDeployer.owner()}`)
  console.log(`Calldata for deploy(${priceOracle}, ${REVENUE_ACCOUNT}, ${TLD}, ${METADATA_BASE_URL}): ${deployCalldata}`)
  console.log(`Calldata for transferOwner(${MULTISIG_ACCOUNT}): ${transferOwnerCalldata}`)
  console.log('Press any key to continue after you complete deploying on multisig')
  await keypress()
  return getDeployedAddresses(hre, ensDeployer, oracleDeployer)
}
deployDeployerForMultisig.tags = ['Multisig']
export default deployDeployerForMultisig
