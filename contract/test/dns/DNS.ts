/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { hre, ethers, waffle } from 'hardhat'
import { Constants, contracts, deployAll } from '../utilities'
const namehash = require('eth-ens-namehash')

describe('DNS Tests', function () {
  const node = namehash.hash('country')
  console.log(`node: ${node}`)

  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.beforeSnapshotId}`)
    await contracts.prepare(this, []) // get the signers
    await deployAll.deploy(this)
    console.log(`1. this.publicResolver.address: ${this.publicResolver.address}`)
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    console.log(`have snapshot: ${this.snapshotId}`)
    console.log(`2. this.publicResolver.address: ${this.publicResolver.address}`)
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
    console.log(`have reverted: ${this.snapshotId}`)
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
    console.log(`have reverted: ${this.beforeSnapshotId}`)
  })

  //   describe('DNS: Check the reading and writing of DNS Entries', function () {
  // it('PR-DNS-0: check writing and reading of DNS Entries', async function () {
  describe('DNS: Check the reading and writing of DNS Entries', async function () {
    const basicSetDNSRecords = async function (this) {
      console.log('HIHIHIHIHIHIHIHIHIHI')
      //   const ens1234 = namehash.hash('a.ens.')
      //   console.log(`ens1.2.3.4: ${ens1234}`)
      //   const country1234 = namehash.hash('a.country. 3600 IN A 1.2.3.4')
      //   console.log(`country1.2.3.4: ${country1234}`)
      console.log(`3. this.publicResolver.address: ${this.publicResolver.address}`)
      // a.country. 3600 IN A 1.2.3.4
      const arec = '016103657468000001000100000e10000401020304'
      // b.country. 3600 IN A 2.3.4.5
      const b1rec = '016203657468000001000100000e10000402030405'
      // b.country. 3600 IN A 3.4.5.6
      const b2rec = '016203657468000001000100000e10000403040506'
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
      const soarec =
              '03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840'
      const rec = '0x' + arec + b1rec + b2rec + soarec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('a.country.')), 1)).to.equal('0x016103657468000001000100000e10000401020304')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('b.country.')), 1)).to.equal('0x016203657468000001000100000e10000402030405016203657468000001000100000e10000403040506')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('country.')), 6)).to.equal('0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840')
    }
    it('permits setting name by owner', basicSetDNSRecords)

    it('should update existing records', async function () {
      console.log(`4. this.publicResolver.address: ${this.publicResolver.address}`)
      // a.country. 3600 IN A 4.5.6.7
      const arec = '016103657468000001000100000e10000404050607'
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061502 15620 1800 1814400 14400
      const soarec =
              '03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840'
      const rec = '0x' + arec + soarec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('a.country.')), 1)).to.equal('0x016103657468000001000100000e10000404050607')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('country.')), 6)).to.equal('0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840')
    })

    it('should keep track of entries', async function () {
      // c.country. 3600 IN A 1.2.3.4
      const crec = '016303657468000001000100000e10000401020304'
      const rec = '0x' + crec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      // Initial check
      let hasEntries = await this.publicResolver.hasDNSRecords(
        node,
        ethers.utils.keccak256(dnsName('c.country.'))
      )
      expect(hasEntries).to.be.true
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dnsName('d.country.')))
      expect(hasEntries).to.be.false

      // Update with no new data makes no difference
      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dnsName('c.country.')))
      expect(hasEntries).to.be.true

      // c.country. 3600 IN A
      const crec2 = '016303657468000001000100000e100000'
      const rec2 = '0x' + crec2

      await this.publicResolver.setDNSRecords(node, rec2, { from: this.deployer.address })

      // Removal returns to 0
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dnsName('c.country.')))
      expect(hasEntries).to.be.false
    })

    it('should handle single-record updates', async function () {
      // e.country. 3600 IN A 1.2.3.4
      const erec = '016503657468000001000100000e10000401020304'
      const rec = '0x' + erec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('e.country.')), 1)).to.equal('0x016503657468000001000100000e10000401020304')
    })

    it('forbids setting DNS records by non-owners', async function () {
      // f.country. 3600 IN A 1.2.3.4
      const frec = '016603657468000001000100000e10000401020304'
      const rec = '0x' + frec
      await expect(
        this.publicResolver.setDNSRecords(node, rec, { from: this.bob })
      ).to.be.reverted
    })

    const basicSetZonehash = async () => {
      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.deployer.address }
      )
      expect(await this.publicResolver.zonehash(node)).to.equal('0x0000000000000000000000000000000000000000000000000000000000000001')
    }

    it('permits setting zonehash by owner', basicSetZonehash)

    it('can overwrite previously set zonehash', async function () {
      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.deployer.address }
      )
      expect(await this.publicResolver.zonehash(node))
        .to.equal('0x0000000000000000000000000000000000000000000000000000000000000001')

      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: this.deployer.address }
      )
      expect(await this.publicResolver.zonehash(node))
        .to.equal('0x0000000000000000000000000000000000000000000000000000000000000002')
    })

    it('can overwrite to same zonehash', async function () {
      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.deployer.address }
      )
      expect(
        await this.publicResolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )

      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: this.deployer.address }
      )
      expect(await this.publicResolver.zonehash(node))
        .to.equal('0x0000000000000000000000000000000000000000000000000000000000000002')
    })

    it('forbids setting zonehash by non-owners', async function () {
      await expect(
        this.publicResolver.setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: this.bob }
        )
      ).to.be.reverted
    })

    it('forbids writing same zonehash by non-owners', async function () {
      await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.deployer.address }
      )

      await expect(
        this.publicResolver.setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: this.bob }
        )
      ).to.be.reverted
    })

    it('returns empty when fetching nonexistent zonehash', async function () {
      expect(await this.publicResolver.zonehash(node)).to.equal(null)
    })

    it('emits the correct event', async function () {
      let tx = await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.deployer.address }
      )
      expect(tx.logs.length).to.equal(1)
      expect(tx.logs[0].event).to.equal('DNSZonehashChanged')
      expect(tx.logs[0].args.node).to.equal(node)
      expect(tx.logs[0].args.lastzonehash).to.equal(undefined)
      expect(
        tx.logs[0].args.zonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )

      tx = await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: this.deployer.address }
      )
      expect(tx.logs.length).to.equal(1)
      expect(tx.logs[0].event).to.equal('DNSZonehashChanged')
      expect(tx.logs[0].args.node).to.equal(node)
      expect(
        tx.logs[0].args.lastzonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )
      expect(
        tx.logs[0].args.zonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )

      tx = await this.publicResolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { from: this.deployer.address }
      )
      expect(tx.logs.length).to.equal(1)
      expect(tx.logs[0].event).to.equal('DNSZonehashChanged')
      expect(tx.logs[0].args.node).to.equal(node)
      expect(
        tx.logs[0].args.lastzonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )
      expect(
        tx.logs[0].args.zonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    })

    it('resets dnsRecords on version change', async function () {
      await basicSetDNSRecords()
      await this.publicResolver.clearRecords(node)
      expect(
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('a.country.')), 1)).to.equal(
        null
      )
      expect(
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('b.country.')), 1)).to.equal(
        null
      )
      expect(
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dnsName('country.')), 6)).to.equal(
        null
      )
    })

    it('resets zonehash on version change', async function () {
      await basicSetZonehash()
      await this.publicResolver.clearRecords(node)
      expect(await this.publicResolver.zonehash(node)).to.equal(null)
    })
  })
})
// })

function dnsName (name) {
  // strip leading and trailing .
  const n = name.replace(/^\.|\.$/gm, '')

  const bufLen = n === '' ? 1 : n.length + 2
  const buf = Buffer.allocUnsafe(bufLen)

  offset = 0
  if (n.length) {
    const list = n.split('.')
    for (let i = 0; i < list.length; i++) {
      const len = buf.write(list[i], offset + 1)
      buf[offset] = len
      offset += len + 1
    }
  }
  buf[offset++] = 0
  return (
    '0x' +
      buf.reduce(
        (output, elem) => output + ('0' + elem.toString(16)).slice(-2),
        ''
      )
  )
}
