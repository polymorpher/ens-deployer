/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { hre, ethers, waffle } from 'hardhat'
import { deployAll } from '../utilities'

describe('PublicResolver Test', function () {
  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.beforeSnapshotId}`)
    await deployAll.deploy(this)
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.snapshotId}`)
    // await deployAll.deploy(this)
    console.log(this.oracleDeployer.address)
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
    console.log(`have reverted: ${this.snapshotId}`)
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
    console.log(`have reverted: ${this.beforeSnapshotId}`)
  })

  describe('PublicResolver: DNS  functions', function () {
    it('PR-DNS-0: write DNS records', async function () {
    })
  })
})
