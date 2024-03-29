import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { ENSDeployer } from '../typechain-types'
import assert from 'assert'
import deployOracle from './oracle'
import { deployLibs, getDeployedAddresses } from './libs'

const REVENUE_ACCOUNT = process.env.REVENUE_ACCOUNT as string
const METADATA_BASE_URL = process.env.METADATA_BASE_URL as string

const func = async function (hre: HardhatRuntimeEnvironment) {
  console.log({ REVENUE_ACCOUNT })
  assert(ethers.utils.isAddress(REVENUE_ACCOUNT), 'Invalid Revenue Account')
  assert(METADATA_BASE_URL?.length > 0, 'Invalid METADATA_BASE_URL')
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const TLD = process.env.TLD || 'country'
  const oracleDeployer = await deployOracle(hre)
  const { ENSUtils, ENSRegistryDeployer, ENSNFTDeployer, ENSControllerDeployer, ENSPublicResolverDeployer, MulticallDeployer, MetadataServiceDeployer, ENSUniversalResolverDeployer } = await deployLibs(hre)
  const ENSDeployer = await deploy('ENSDeployer', {
    from: deployer,
    args: [deployer],
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
  const ensDeployer = await ethers.getContractAt('ENSDeployer', ENSDeployer.address) as ENSDeployer
  await ensDeployer.deploy(await oracleDeployer.oracle(), REVENUE_ACCOUNT, TLD, METADATA_BASE_URL)
  const receipt = await ensDeployer.transferOwner(deployer).then(tx => tx.wait())
  console.log('transferOwner tx', receipt.transactionHash)
  return getDeployedAddresses(hre, ensDeployer, oracleDeployer)
}
func.tags = ['Deployer']
export default func
