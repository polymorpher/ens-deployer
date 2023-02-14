import { ethers } from 'hardhat'
import { Context } from 'mocha'

export async function prepare (testEnvironment: Context) {
  testEnvironment.signers = await ethers.getSigners()
  testEnvironment.deployer = testEnvironment.signers[0]
  testEnvironment.operatorA = testEnvironment.signers[1]
  testEnvironment.operatorB = testEnvironment.signers[2]
  testEnvironment.operatorC = testEnvironment.signers[3]
  testEnvironment.alice = testEnvironment.signers[4]
  testEnvironment.bob = testEnvironment.signers[5]
  testEnvironment.carol = testEnvironment.signers[6]
  testEnvironment.dora = testEnvironment.signers[7]
  testEnvironment.ernie = testEnvironment.signers[8]
  const balances = await Promise.all(testEnvironment.signers.slice(0, 9).map(s => s.getBalance()))
  console.log('balances:', balances.map(b => ethers.utils.formatEther(b)))
}

export async function deploy (context, contracts) {
  for (const contract of contracts) {
    context[contract[0]] = await contract[1].deploy(...(contract[2] || []))
    await context[contract[0]].deployed()
  }
}
