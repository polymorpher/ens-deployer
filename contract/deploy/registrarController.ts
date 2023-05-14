import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import assert from 'assert'

import dotenv from 'dotenv'
import { RegistrarController } from '../typechain-types'

dotenv.config({ path: '.env.rc' })

const REVENUE_ACCOUNT = process.env.REVENUE_ACCOUNT as string
const MULTISIG_ACCOUNT = process.env.MULTISIG_ACCOUNT as string
const TLD_BASE_REGISTRAR_IMPLEMENTATION = process.env.TLD_BASE_REGISTRAR_IMPLEMENTATION as string
const PRICE_ORACLE = process.env.PRICE_ORACLE as string
const MIN_COMMITMENT_AGE = process.env.MIN_COMMITMENT_AGE as string
const MAX_COMMITMENT_AGE = process.env.MAX_COMMITMENT_AGE as string
const REVERSE_REGISTRAR = process.env.REVERSE_REGISTRAR as string
const NAME_WRAPPER = process.env.NAME_WRAPPER as string

//     TLDBaseRegistrarImplementation _base,
//     IPriceOracle _prices,
//     uint256 _minCommitmentAge,
//     uint256 _maxCommitmentAge,
//     ReverseRegistrar _reverseRegistrar,
//     INameWrapper _nameWrapper,
//     bytes32 _baseNode,
//     string memory _baseExtension,
//     address _revenueAccount

const func = async function (hre: HardhatRuntimeEnvironment) {
  console.log({ REVENUE_ACCOUNT, MULTISIG_ACCOUNT })
  assert(ethers.utils.isAddress(REVENUE_ACCOUNT), 'Invalid Revenue Account')
  assert(ethers.utils.isAddress(MULTISIG_ACCOUNT), 'Invalid Multisig Account')
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const TLD = process.env.TLD || 'country'
  const RegistrarController = await deploy('RegistrarController', {
    from: deployer,
    args: [
      TLD_BASE_REGISTRAR_IMPLEMENTATION,
      PRICE_ORACLE,
      MIN_COMMITMENT_AGE,
      MAX_COMMITMENT_AGE,
      REVERSE_REGISTRAR,
      NAME_WRAPPER,
      ethers.utils.namehash(TLD),
      TLD,
      REVENUE_ACCOUNT
    ],
    log: true
  })
  const rc = await ethers.getContractAt('RegistrarController', RegistrarController.address) as RegistrarController
  const receipt = await rc.transferOwnership(MULTISIG_ACCOUNT).then(tx => tx.wait())
  console.log('transferOwner tx', receipt.transactionHash)
  console.log(`IMPORTANT: Must setController to ${rc.address} in NameWrapper and ReverseRegistrar, using MultiSig `)
}
func.tags = ['RC']
export default func
