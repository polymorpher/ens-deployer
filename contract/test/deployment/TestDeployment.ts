/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { hre, ethers, waffle } from 'hardhat'
import { Constants, deployAll } from '../utilities'

describe('Deployments Test', function () {
  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.beforeSnapshotId}`)
    await deployAll.deploy(this)
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.snapshotId}`)
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
    console.log(`have reverted: ${this.snapshotId}`)
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
    console.log(`have reverted: ${this.beforeSnapshotId}`)
  })

  describe('Deployments: Contracts Deployed', function () {
    it('PR-DEP-0: check the deployed addresses', async function () {
      expect(this.oracleDeployer.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.oracleDeployer.address).to.be.properAddress
      expect(this.priceOracle.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.priceOracle.address).to.be.properAddress
      expect(this.usdOracle.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.usdOracle.address).to.be.properAddress
      expect(this.ens.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.ens.address).to.be.properAddress
      expect(this.fifsRegistrar.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.fifsRegistrar.address).to.be.properAddress
      expect(this.reverseRegistrar.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.reverseRegistrar.address).to.be.properAddress
      expect(this.baseRegistrar.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.baseRegistrar.address).to.be.properAddress
      expect(this.metadataService.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.metadataService.address).to.be.properAddress
      expect(this.nameWrapper.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.nameWrapper.address).to.be.properAddress
      expect(this.registrarController.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.registrarController.address).to.be.properAddress
      expect(this.publicResolver.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.publicResolver.address).to.be.properAddress
      expect(this.universalResolver.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.universalResolver.address).to.be.properAddress
      expect(this.multicall.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.multicall.address).to.be.properAddress
    })
  })
})
