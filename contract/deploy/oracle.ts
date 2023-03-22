import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { OracleDeployer } from '../typechain-types'

const ORACLE_PRICE_NATIVE_ASSET_NANO_USD = process.env.ORACLE_PRICE_NATIVE_ASSET_NANO_USD || '100000000000'
const ORACLE_PRICE_BASE_UNIT_PRICE = process.env.ORACLE_PRICE_BASE_UNIT_PRICE || '32'
const ORACLE_PRICE_PREMIUM = JSON.parse(process.env.ORACLE_PRICE_PREMIUM || '{}')
const PRICE_MANAGER = process.env.PRICE_MANAGER as string

const deployOracle = async function (hre: HardhatRuntimeEnvironment): Promise<OracleDeployer> {
  console.log({ ORACLE_PRICE_NATIVE_ASSET_NANO_USD, ORACLE_PRICE_BASE_UNIT_PRICE, ORACLE_PRICE_PREMIUM })
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const OracleDeployer = await deploy('OracleDeployer', {
    from: deployer,
    args: [
      PRICE_MANAGER,
      ORACLE_PRICE_NATIVE_ASSET_NANO_USD,
      ORACLE_PRICE_BASE_UNIT_PRICE,
      Object.keys(ORACLE_PRICE_PREMIUM),
      Object.values(ORACLE_PRICE_PREMIUM)
    ]
  })
  const oracleDeployer = await ethers.getContractAt('OracleDeployer', OracleDeployer.address) as OracleDeployer
  const priceOracle = await oracleDeployer.oracle()
  const usdOracle = await oracleDeployer.usdOracle()
  console.log('oracleDeployer:', oracleDeployer.address)
  console.log('- priceOracle:', priceOracle)
  console.log('- usdOracle:', usdOracle)
  return oracleDeployer
}
deployOracle.tags = ['Oracle']
export default deployOracle
