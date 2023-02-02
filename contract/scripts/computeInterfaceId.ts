import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { Interface } from 'ethers/lib/utils'
const { makeInterfaceId } = require('@openzeppelin/test-helpers')

function computeInterfaceId (iface: Interface) {
  // console.log(iface.)
  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => {
      console.log(frag.name)
      return frag.format('sighash')
    })
  )
}

async function main () {
  const contract = await ethers.getContractFactory('TLDNameWrapper')
  const interfaceId = computeInterfaceId(contract.interface)
  console.log('TLDNameWrapper', interfaceId)
  const interfaceId2 = computeInterfaceId(new Interface([
    'function available(string) returns (bool)',
    'function commit(bytes32)',
    'function makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64) pure returns (bytes32)',
    'function register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64) payable',
    'function renew(string,uint256) payable',
    'function rentPrice(string,uint256) view returns (tuple(uint256,uint256))'
  ]))
  console.log('RegistrarController', interfaceId2)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
