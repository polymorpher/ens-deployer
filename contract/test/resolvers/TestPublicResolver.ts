/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import {
  Constants,
  contracts
} from '../utilities'

describe('PublicResolver Test', function () {
  before(async function () {
    await contracts.prepare(this, [
    //   'ENSDeployer',
      'Multicall3',
      'OracleDeployer',
      'RegistrarController',
      'TLDNameWrapper'
    ])
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    await contracts.deployAll(this)
    console.log(this.oracleDeployer.address)
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
  })

  describe('PublicResolver: DNS  functions', function () {
    it('PR-DNS-0: check the deployed Address', async function () {
      expect(this.oracleDeployer.address).not.to.equal(Constants.ZERO_ADDRESS)
      expect(this.oracleDeployer.address).to.be.properAddress
    })
  })
})
