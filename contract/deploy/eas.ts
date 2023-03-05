import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import { EAS } from '../typechain-types'

const DC_CONTRACT = process.env.DC_CONTRACT
const MAX_NUM_ALIAS = process.env.MAX_NUM_ALIAS

const func = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const EAS = await deploy('EAS', {
    from: deployer,
    args: [
      DC_CONTRACT,
      MAX_NUM_ALIAS
    ]
  })
  const eas: EAS = await ethers.getContractAt('EAS', EAS.address)
  console.log('EAS deployed at:', eas.address)
  console.log('- EAS Owner:', await eas.owner())
  console.log('- DC:', await eas.dc())
  console.log('- maxNumAlias:', (await eas.maxNumAlias()).toString())
}
func.tags = ['EAS']
func.dependencies = ['ENSDeployer', 'DC']
export default func
