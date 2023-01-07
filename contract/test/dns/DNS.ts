/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { Constants, contracts, deployAll, dns } from '../utilities'
const namehash = require('eth-ens-namehash')

describe('DNS Tests', function () {
  const ONE_ETH = ethers.utils.parseEther('1')

  dns.displayNode('ETH')
  dns.displayNode('country')
  dns.displayNode('test.country')

  const TLD = process.env.TLD || 'country'
  const TLDHASH = namehash.hash(TLD)
  const DOMAIN = 'test.country'
  const node = namehash.hash(DOMAIN)

  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    await contracts.prepare(this, []) // get the signers
    await deployAll.deploy(this)
    console.log(`nameWrapper.TLD_NODE: ${await this.nameWrapper.TLD_NODE()}`)

    // register test.country
    const duration = ethers.BigNumber.from(365 * 24 * 3600)
    const secret = Constants.EMPTY_BYTES32
    const callData = []
    const reverseRecord = false
    const fuses = ethers.BigNumber.from(0)
    const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
    // const price = await this.priceOracle.price(node, 0, duration)
    // console.log(`price  : ${JSON.stringify(price.toString())}`)
    // console.log(`ONE_ETH: ${JSON.stringify(ONE_ETH.mul(1100).toString())}`)
    const commitment = await this.registrarController.makeCommitment(
    //   node,
    //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(DOMAIN)),
      DOMAIN,
      this.deployer.address,
      duration,
      secret,
      this.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry
    )
    let tx = await this.registrarController.commit(commitment)
    await tx.wait()
    tx = await this.registrarController.register(
    //   node,
    //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(DOMAIN)),
      DOMAIN,
      this.deployer.address,
      duration,
      secret,
      this.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry,
      {
        value: ONE_ETH.mul(1100)
      }
    )
    await tx.wait()
    console.log('setting record using NameWrapper')
    // Set  record for the name in the ENS Registry using TLDNameWrapper
    // tx = await this.nameWrapper.setRecord(
    //   node, // node,
    //   this.deployer.address, // owner,
    //   this.publicResolver.address, // resolver,
    //   duration // ttl,
    // )
    // await tx.wait()
    // console.log('subNodOwner set')
    // // Set the subnodeOwner using TLDNameWrapper
    // tx = await this.nameWrapper.setSubnodeRecord(
    //   TLDHASH, // parentNode,
    //   DOMAIN, // label,
    //   this.deployer.address, // owner,
    //   this.publicResolver.address, // resolver,
    //   duration, // ttl,
    //   fuses, // fuses,
    //   wrapperExpiry // expiry
    // )
    // await tx.wait()
    console.log('Namewrapper record set')
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    // await this.ens.setSubnodeOwner(
    //   Constants.EMPTY_BYTES32,
    //   //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(DOMAIN)),
    //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(TLD)),
    //   //   TLDHASH,
    //   this.deployer.address,
    //   { from: this.deployer.address }
    // )
    // await this.ens.setSubnodeOwner(
    // //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(TLD)),
    //   TLDHASH,
    //   //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes(DOMAIN)),
    //   //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('country')),
    //   //   node,
    //   this.deployer.address,
    //   { from: this.deployer.address }
    // )
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
  })

  //   describe('DNS: Check the reading and writing of DNS Entries', function () {
  // it('PR-DNS-0: check writing and reading of DNS Entries', async function () {
  describe('DNS: Check the reading and writing of DNS Entries', async function () {
    const basicSetDNSRecords = async function (this) {
      console.log('In basicSetDNSRecords')
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

      console.log(`a.country: ${ethers.utils.keccak256(dns.dnsName('a.country.'))}`)
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('a.country.')), 1)).to.equal('0x016103657468000001000100000e10000401020304')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('b.country.')), 1)).to.equal('0x016203657468000001000100000e10000402030405016203657468000001000100000e10000403040506')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('country.')), 6)).to.equal('0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840')
    }
    it('permits setting name by owner', basicSetDNSRecords)

    it('should update existing records', async function () {
      // a.country. 3600 IN A 4.5.6.7
      const arec = '016103657468000001000100000e10000404050607'
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061502 15620 1800 1814400 14400
      const soarec =
              '03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840'
      const rec = '0x' + arec + soarec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('a.country.')), 1)).to.equal('0x016103657468000001000100000e10000404050607')
      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('country.')), 6)).to.equal('0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840')
    })

    it('should keep track of entries', async function () {
      // c.country. 3600 IN A 1.2.3.4
      const crec = '016303657468000001000100000e10000401020304'
      const rec = '0x' + crec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      // Initial check
      let hasEntries = await this.publicResolver.hasDNSRecords(
        node,
        ethers.utils.keccak256(dns.dnsName('c.country.'))
      )
      expect(hasEntries).to.be.true
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dns.dnsName('d.country.')))
      expect(hasEntries).to.be.false

      // Update with no new data makes no difference
      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dns.dnsName('c.country.')))
      expect(hasEntries).to.be.true

      // c.country. 3600 IN A
      const crec2 = '016303657468000001000100000e100000'
      const rec2 = '0x' + crec2

      await this.publicResolver.setDNSRecords(node, rec2, { from: this.deployer.address })

      // Removal returns to 0
      hasEntries = await this.publicResolver.hasDNSRecords(node, ethers.utils.keccak256(dns.dnsName('c.country.')))
      expect(hasEntries).to.be.false
    })

    it('should handle single-record updates', async function () {
      // e.country. 3600 IN A 1.2.3.4
      const erec = '016503657468000001000100000e10000401020304'
      const rec = '0x' + erec

      await this.publicResolver.setDNSRecords(node, rec, { from: this.deployer.address })

      expect(await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('e.country.')), 1)).to.equal('0x016503657468000001000100000e10000401020304')
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
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('a.country.')), 1)).to.equal(
        null
      )
      expect(
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('b.country.')), 1)).to.equal(
        null
      )
      expect(
        await this.publicResolver.dnsRecord(node, ethers.utils.keccak256(dns.dnsName('country.')), 6)).to.equal(
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
