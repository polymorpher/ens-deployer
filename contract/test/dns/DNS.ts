/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { Constants, contracts, deployAll, dns } from '../utilities'
// import { getTxCost } from '../utilities/contracts'
// const namehash = require('eth-ens-namehash')

describe('DNS Tests', function () {
  const ONE_ETH = ethers.utils.parseEther('1')

  //   dns.displayNode('ETH')
  //   dns.displayNode('country')
  dns.displayNode('test.country')
  //   dns.displayNode('test')

  const TLD = process.env.TLD || 'country'
  const DOMAIN = 'test.country'
  const node = dns.makeNode(TLD, DOMAIN)
  const resolverNode = dns.makeNode(TLD, 'resolver')
  console.log(`resolverNode: ${resolverNode}`)
  // Set up the name records for use in all DNS tests
  //   const nameDOMAIN = (DOMAIN + '.' + TLD + '.')
  const nameDOMAIN = (DOMAIN + '.')
  const nameDOMAINHash = ethers.utils.keccak256(dns.dnsName(nameDOMAIN))
  //   console.log(`nameDOMAINHash: ${nameDOMAINHash}`)
  const aName = 'a.' + nameDOMAIN
  const aNameHash = ethers.utils.keccak256(dns.dnsName(aName))
  //   console.log(`aNameHash: ${aNameHash}`)
  const bName = 'b.' + nameDOMAIN
  const bNameHash = ethers.utils.keccak256(dns.dnsName(bName))
  const cName = 'c.' + nameDOMAIN
  const cNameHash = ethers.utils.keccak256(dns.dnsName(cName))
  const dName = 'd.' + nameDOMAIN
  const dNameHash = ethers.utils.keccak256(dns.dnsName(dName))
  const eName = 'e.' + nameDOMAIN
  const eNameHash = ethers.utils.keccak256(dns.dnsName(eName))
  const fName = 'f.' + nameDOMAIN

  // Initial DNS Entries
  // a.test.country. 3600 IN A 1.2.3.4
  const initARec = dns.encodeARecord(aName, '1.2.3.4')
  // b.test.country. 3600 IN A 2.3.4.5
  const initB1Rec = dns.encodeARecord(bName, '2.3.4.5')
  // b.test.country. 3600 IN A 3.4.5.6
  const initB2Rec = dns.encodeARecord(bName, '3.4.5.6')
  // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
  // mapping for encodeSRecord (recName, primary, admin, serial, refresh, retry, expiration, minimum) {
  const initSOARec = dns.encodeSRecord(nameDOMAIN, 'ns1.countrydns.xyz.', 'hostmaster.test.country', '2018061501', '15620', '1800', '1814400', '14400')
  const initRec = '0x' + initARec + initB1Rec + initB2Rec + initSOARec

  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    await contracts.prepare(this, []) // get the signers
    await deployAll.deploy(this)

    // console.log(`Owner of test.country before registration: ${await this.ens.owner(node)}`)

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
    const commitment = await this.registrarController.connect(this.alice).makeCommitment(
      DOMAIN,
      this.alice.address,
      duration,
      secret,
      this.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry
    )
    let tx = await this.registrarController.connect(this.alice).commit(commitment)
    await tx.wait()
    tx = await this.registrarController.register(
      DOMAIN,
      this.alice.address,
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
    // Set Initial DNS entries
    tx = await this.publicResolver.connect(this.alice).setDNSRecords(node, initRec)
    await tx.wait()
    // Set intial zonehash
    expect(await this.publicResolver.zonehash(node)).to.equal('0x')
    tx = await this.publicResolver.connect(this.alice).setZonehash(
      node,
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    )
    await tx.wait()
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    // console.log(`this.snapshotId: ${this.snapshotId}`)
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
  })

  //   describe('DNS: Check the reading and writing of DNS Entries', function () {
  // it('PR-DNS-0: check writing and reading of DNS Entries', async function () {
  describe('DNS: Check the reading of initial DNS Entries', async function () {
    it('DNS-001 permits setting name by owner', async function () {
      // Test Ownership via ENSRegistry
      //   console.log(`DNS-001: node: ${node}`)
      //   console.log(`DNS-001: nodeArrayify: ${ethers.utils.arrayify(node)}`)
      expect(await this.ens.owner(node)).to.equal(this.nameWrapper.address)
      // Test Ownership via DNSResolver by seeing that alice's updates were succesfull
      expect(await this.publicResolver.dnsRecord(node, aNameHash, Constants.DNSRecordType.A)).to.equal('0x' + initARec)
      expect(await this.publicResolver.dnsRecord(node, bNameHash, Constants.DNSRecordType.A)).to.equal('0x' + initB1Rec + initB2Rec)
      expect(await this.publicResolver.dnsRecord(node, nameDOMAINHash, Constants.DNSRecordType.SOA)).to.equal('0x' + initSOARec)
    })

    it('DNS-002 should update existing records', async function () {
      // a.test.country. 3600 IN A 4.5.6.7 (changing address)
      const initARec = dns.encodeARecord(aName, '4.5.6.7')
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061502 15620 1800 1814400 14400 (changing serial)
      // mapping for encodeSRecord (recName, primary, admin, serial, refresh, retry, expiration, minimum) {
      const soinitARec = dns.encodeSRecord(nameDOMAIN, 'ns1.countrydns.xyz.', 'hostmaster.test.country', '2018061502', '15620', '1800', '1814400', '14400')
      const rec = '0x' + initARec + soinitARec

      await this.publicResolver.connect(this.alice).setDNSRecords(node, rec)
      expect(await this.publicResolver.dnsRecord(node, aNameHash, Constants.DNSRecordType.A)).to.equal('0x' + initARec)
      expect(await this.publicResolver.dnsRecord(node, nameDOMAINHash, Constants.DNSRecordType.SOA)).to.equal('0x' + soinitARec)

      // unchanged records still exist
      // b.test.country. 3600 IN A 2.3.4.5
      const initB1Rec = dns.encodeARecord(bName, '2.3.4.5')
      // b.test.country. 3600 IN A 3.4.5.6
      const initB2Rec = dns.encodeARecord(bName, '3.4.5.6')
      expect(await this.publicResolver.dnsRecord(node, bNameHash, Constants.DNSRecordType.A)).to.equal('0x' + initB1Rec + initB2Rec)
    })

    it('DNS-003 should keep track of entries', async function () {
      // c.test.country. 3600 IN A 1.2.3.4
      const cRec = dns.encodeARecord(cName, '1.2.3.4')
      const rec = '0x' + cRec
      await this.publicResolver.connect(this.alice).setDNSRecords(node, rec)

      // Initial check
      let hasEntries = await this.publicResolver.hasDNSRecords(node, cNameHash)
      expect(hasEntries).to.be.true
      hasEntries = await this.publicResolver.hasDNSRecords(node, dNameHash)
      expect(hasEntries).to.be.false

      // Update with no new data makes no difference
      await this.publicResolver.connect(this.alice).setDNSRecords(node, rec)
      hasEntries = await this.publicResolver.hasDNSRecords(node, cNameHash)
      expect(hasEntries).to.be.true

      // c.test.country. 3600 IN A
      const cRec2 = dns.encodeARecord(cName, '')
      const rec2 = '0x' + cRec2

      await this.publicResolver.connect(this.alice).setDNSRecords(node, rec2)

      // Removal returns to 0
      hasEntries = await this.publicResolver.hasDNSRecords(node, cNameHash)
      expect(hasEntries).to.be.false
    })

    it('DNS-004 should handle single-record updates', async function () {
      // e.test.country. 3600 IN A 1.2.3.4
      const eRec = dns.encodeARecord(eName, '1.2.3.4')
      const rec = '0x' + eRec

      await this.publicResolver.connect(this.alice).setDNSRecords(node, rec)

      expect(await this.publicResolver.dnsRecord(node, eNameHash, 1)).to.equal('0x' + eRec)
    })

    it('DNS-005 forbids setting DNS records by non-owners', async function () {
      // f.test.country. 3600 IN A 1.2.3.4
      const fRec = dns.encodeARecord(fName, '1.2.3.4')
      const rec = '0x' + fRec
      await expect(
        this.publicResolver.connect(this.bob).setDNSRecords(node, rec)
      ).to.be.reverted
    })

    it('DNS-006 permits setting zonehash by owner', async function () {
      expect(await this.publicResolver.zonehash(node)).to.equal('0x0000000000000000000000000000000000000000000000000000000000000001')
    })

    it('DNS-007 can overwrite previously set zonehash', async function () {
      await this.publicResolver.connect(this.alice).setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )
      expect(await this.publicResolver.zonehash(node))
        .to.equal('0x0000000000000000000000000000000000000000000000000000000000000002')
    })

    it('DNS-008 can overwrite to same zonehash', async function () {
      await this.publicResolver.connect(this.alice).setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: this.alice.address }
      )
      expect(
        await this.publicResolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )
    })

    it('DNS-009 forbids setting zonehash by non-owners', async function () {
      await expect(
        this.publicResolver.connect(this.bob).setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000002'
        )
      ).to.be.reverted
    })

    it('DNS-010 forbids writing same zonehash by non-owners', async function () {
      await expect(
        this.publicResolver.connect(this.bob).setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        )
      ).to.be.reverted
    })

    it('DNS-011 returns empty when fetching nonexistent zonehash', async function () {
      // TODO move initialization in before each to a function
      // TODO see if we can delete a zonehash
      //   expect(await this.publicResolver.zonehash(node)).to.equal(null)
    })

    it('DNS-012 emits the correct event', async function () {
      let tx = await this.publicResolver.connect(this.alice).setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )
      let receipt = await tx.wait()
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(node)
      expect(receipt.events[0].args[1]).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )
      expect(
        receipt.events[0].args.zonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000003'
      )
      receipt = await tx.wait()
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(node)
      expect(receipt.events[0].args[1]).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000002'
      )
      expect(
        receipt.events[0].args.zonehash).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000003'
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
      receipt = await tx.wait()
      //   console.log(`receipt: ${JSON.stringify(receipt)}`)
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(node)
      expect(
        receipt.events[0].args[1]).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000003'
      )
      expect(
        receipt.events[0].args[2]).to.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    })

    it('DNS-013 resets dnsRecords on version change', async function () {
      await this.publicResolver.connect(this.alice).clearRecords(node)
      expect(
        await this.publicResolver.dnsRecord(node, aNameHash, 1)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(node, bNameHash, 1)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(node, nameDOMAINHash, 6)).to.equal(
        '0x'
      )
    })

    it('DNS-014 resets zonehash on version change', async function () {
      await this.publicResolver.connect(this.alice).clearRecords(node)
      expect(await this.publicResolver.zonehash(node)).to.equal('0x')
    })
  })

  it('DNS-015 should handle TXT record updates', async function () {
    // test.country. SampleText
    const txtRec = dns.encodeTXTRecord(nameDOMAIN, 'SampleText')
    const rec = '0x' + txtRec

    await this.publicResolver.connect(this.alice).setDNSRecords(node, rec)

    expect(await this.publicResolver.dnsRecord(node, nameDOMAINHash, 16)).to.equal('0x' + txtRec)
  })
})
