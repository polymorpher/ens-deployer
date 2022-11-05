import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'

const f = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const ENSDeployer = await deploy('ENSDeployer', {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    gasLimit: 10e+6
  })
  const ensDeployer = await ethers.getContractAt('ENSDeployer', ENSDeployer.address)
  console.log('deployer account', deployer)
  console.log('ENSDeployer deployed to:', ensDeployer.address)
  console.log('- ens deployed to:', await ensDeployer.ens())
  console.log('- fifsRegistrar deployed to:', await ensDeployer.fifsRegistrar())
  console.log('- reverseRegistrar deployed to:', await ensDeployer.reverseRegistrar())
  console.log('- publicResolver deployed to:', await ensDeployer.publicResolver())
  const receipt = await ensDeployer.transferOwner(deployer).then(tx=>tx.wait())
  console.log('tx', receipt.transactionHash)
  const ens = await ethers.getContractAt('ENSRegistry', await ensDeployer.ens())
  console.log('ens owner:', await ens.owner(new Uint8Array(32)))
  const resolverNode =  ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), await ensDeployer.RESOLVER_LABEL()]))
  const reverseRegNode =  ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), await ensDeployer.REVERSE_REGISTRAR_LABEL()]))
  console.log('resolver node owner:', await ens.owner(resolverNode))
  console.log('reverse registrar node owner:', await ens.owner(reverseRegNode))
}
f.tags = ['ENSDeployer']
export default f
