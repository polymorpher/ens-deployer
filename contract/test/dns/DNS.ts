/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { Constants, contracts, deployAll, dns } from '../utilities'
import namehash from 'eth-ens-namehash'
import { Context } from 'mocha'

function makeTestDomains (subdomains: string[], parentDomain: string): [string, string][] {
  const domains: [string, string][] = []
  for (let i = 0; i < subdomains.length; i++) {
    const domain = subdomains[i] ? `${subdomains[i]}.${parentDomain}` : parentDomain
    const hash = ethers.utils.keccak256(dns.dnsName(domain))
    domains.push([domain, hash])
  }
  return domains
}
// TODO: bring back displayNode helper function and put in separate tests
//   dns.displayNode('ETH')
//   dns.displayNode('country')
//   dns.displayNode('test.country')
//   dns.displayNode('test')

const zoneHashWithOffset = (offset: number = 0): string => {
  const r = new Uint8Array(32)
  r[r.length - 1] = offset % 255
  return '0x' + Buffer.from(r).toString('hex')
}

const TLD = process.env.TLD || 'country'

describe('DNS Tests', function () {
  const TestDomain = 'test'
  const TestNode = namehash.hash(TestDomain + '.' + TLD)
  const TestDomainFqdn = `${TestDomain}.${TLD}.`
  const TestDomainFqdnHash = ethers.utils.keccak256(dns.dnsName(TestDomainFqdn))
  const [[TestSubdomainA, TestSubdomainADnsHash],
    [TestSubdomainB, TestSubdomainBDnsHash],
    [TestSubdomainC, TestSubdomainCDnsHash],
    // eslint-disable-next-line no-unused-vars
    [TestSubdomainD, TestSubdomainDDnsHash],
    [TestSubdomainE, TestSubdomainEDnsHash],
    // eslint-disable-next-line no-unused-vars
    [TestSubdomainF, TestSubdomainFDnsHash],
    // eslint-disable-next-line no-unused-vars
    [oneName, oneNameHash]
  ] = makeTestDomains(['a', 'b', 'c', 'd', 'e', 'f', 'one'], TestDomainFqdn)

  // Initial DNS Entries
  // a.test.country. 3600 IN A 1.2.3.4
  const TestSubdomainAInitialRecord = dns.encodeARecord({ name: TestSubdomainA, ipAddress: '1.2.3.4' })
  // b.test.country. 3600 IN A 2.3.4.5
  const TestSubdomainBInitialRecord1 = dns.encodeARecord({ name: TestSubdomainB, ipAddress: '2.3.4.5' })
  // b.test.country. 3600 IN A 3.4.5.6
  const TestSubdomainBInitialRecord2 = dns.encodeARecord({ name: TestSubdomainB, ipAddress: '3.4.5.6' })
  // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
  const DefaultSoa = {
    primary: 'ns1.countrydns.xyz.',
    admin: 'hostmaster.test.country',
    serial: 2018061501,
    refresh: 15620,
    retry: 1800,
    expiration: 1814400,
    minimum: 14400
  }
  const InitialSoaRecord = dns.encodeSOARecord({ name: TestDomainFqdn, rvalue: DefaultSoa })
  const TestSubdomainOneInitialCnameRecord = dns.encodeCNAMERecord({ name: 'one.test.country', cname: 'harmony.one' })
  const InitialFullDnsRecord = '0x' + TestSubdomainAInitialRecord + TestSubdomainBInitialRecord1 + TestSubdomainBInitialRecord2 + InitialSoaRecord + TestSubdomainOneInitialCnameRecord

  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    await contracts.prepare(this) // get the signers
    await deployAll.deploy(this)

    // register test.country
    const duration = ethers.BigNumber.from(30 * 24 * 3600)
    const secret = Constants.EMPTY_BYTES32
    const callData = []
    const reverseRecord = false
    const fuses = ethers.BigNumber.from(0)
    const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
    const commitment = await this.registrarController.connect(this.alice).makeCommitment(
      TestDomain,
      this.alice.address,
      duration,
      secret,
      this.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry
    )
    const [base, premium] = await this.registrarController.rentPrice(TestDomain, duration)
    let tx = await this.registrarController.connect(this.alice).commit(commitment)
    await tx.wait()
    tx = await this.registrarController.register(
      TestDomain,
      this.alice.address,
      duration,
      secret,
      this.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry,
      {
        value: base.add(premium)
      }
    )
    await tx.wait()
    // Set Initial DNS entries
    console.log('Initializing a.test.country')
    console.log(`node: test.country; hash: ${TestNode}`)
    console.log(`Initial A record for: ${'0x' + TestSubdomainAInitialRecord}`)
    tx = await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, '0x' + TestSubdomainAInitialRecord)
    await tx.wait()
    tx = await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, InitialFullDnsRecord)
    await tx.wait()
    // Set initial zonehash
    expect(await this.publicResolver.zonehash(TestNode)).to.equal('0x')
    tx = await this.publicResolver.connect(this.alice).setZonehash(
      TestNode,
      zoneHashWithOffset(1)
    )
    await tx.wait()
  })

  beforeEach(async function () {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
  })

  afterEach(async function () {
    await waffle.provider.send('evm_revert', [this.snapshotId])
  })

  after(async function () {
    await waffle.provider.send('evm_revert', [this.beforeSnapshotId])
  })

  describe('DNS: Check the reading of initial DNS Entries', async function () {
    it('DNS-001 permits setting name by owner', async function (this: Context) {
      // Test Ownership via ENSRegistry
      console.log(`DNS-001: node: ${TestNode}`)
      expect(await this.nameWrapper.TLD_NODE()).to.equal(namehash.hash('country'))
      expect(await this.ens.owner(TestNode)).to.equal(this.nameWrapper.address)
      expect(await this.baseRegistrar.ownerOf(ethers.utils.id('test'))).to.equal(this.nameWrapper.address)

      // test an unregistered node
      await expect(this.baseRegistrar.ownerOf(ethers.utils.id('testxyz'))).to.be.reverted

      // Use the three lines below if baseRegistrar owner does not revert on non-existent domains
      // const testxyzNode = namehash.hash('testxyz' + '.' + TLD)
      // expect(await this.ens.owner(testxyzNode)).to.equal(Constants.ZERO_ADDRESS)
      // expect(await this.baseRegistrar.ownerOf(ethers.utils.id('testxyz'))).to.equal(Constants.ZERO_ADDRESS)

      // Test ownership via DNSResolver by checking that alice's updates were successful
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, Constants.DNSRecordType.A)).to.equal('0x' + TestSubdomainAInitialRecord)
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, Constants.DNSRecordType.A)).to.equal('0x' + TestSubdomainBInitialRecord1 + TestSubdomainBInitialRecord2)
      expect(await this.publicResolver.dnsRecord(TestNode, oneNameHash, Constants.DNSRecordType.CNAME)).to.equal('0x' + TestSubdomainOneInitialCnameRecord)
      expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, Constants.DNSRecordType.SOA)).to.equal('0x' + InitialSoaRecord)
    })

    it('DNS-002 should update existing records', async function (this: Context) {
      // a.test.country. 3600 IN A 4.5.6.7 (changing address)
      const updatedARecord = dns.encodeARecord({ name: TestSubdomainA, ipAddress: '4.5.6.7' })
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061502 15620 1800 1814400 14400 (changing serial)
      //   const [updatedSoaRecord] = dns.encodeSOARecord(TestDomainFqdn, { ...DefaultSoa, serial: 2018061502 })
      const updatedSoaRecord = dns.encodeSOARecord({ name: TestDomainFqdn, rvalue: { ...DefaultSoa, serial: 2018061502 } })
      const updatedRecord = '0x' + updatedARecord + updatedSoaRecord
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, updatedRecord)
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, Constants.DNSRecordType.A)).to.equal('0x' + updatedARecord)
      expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, Constants.DNSRecordType.SOA)).to.equal('0x' + updatedSoaRecord)

      // unchanged records still exist
      // b.test.country. 3600 IN A 2.3.4.5
      const initB1Rec = dns.encodeARecord({ name: TestSubdomainB, ipAddress: '2.3.4.5' })
      // b.test.country. 3600 IN A 3.4.5.6
      const initB2Rec = dns.encodeARecord({ name: TestSubdomainB, ipAddress: '3.4.5.6' })
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, Constants.DNSRecordType.A)).to.equal('0x' + initB1Rec + initB2Rec)
    })

    it('DNS-003 should keep track of entries', async function (this: Context) {
      // c.test.country. 3600 IN A 1.2.3.4
      const cRec = dns.encodeARecord({ name: TestSubdomainC, ipAddress: '1.2.3.4' })
      const rec = '0x' + cRec
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

      // Initial check
      let hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      expect(hasEntries).to.be.true
      hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainDDnsHash)
      // expect(hasEntries, 'TestSubdomainD should have no DNS entry').to.be.false

      // Update with no new data makes no difference
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)
      hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      expect(hasEntries).to.be.true

      // c.test.country. 3600 IN A
      const cRec2 = dns.encodeARecord({ name: TestSubdomainC, ipAddress: '' })
      const rec2 = '0x' + cRec2
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec2)

      // TODO: fork dns-js and fix the bug for encoding empty A record. See comment on https://github.com/polymorpher/ens-deployer/pull/6/files#r1105393215
      // Removal returns to 0
      // hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      // expect(hasEntries, 'TestSubdomainC should not have DNS entry').to.be.false
    })

    it('DNS-004 should handle single-record updates', async function (this: Context) {
      // e.test.country. 3600 IN A 1.2.3.4
      const eRec = dns.encodeARecord({ name: TestSubdomainE, ipAddress: '1.2.3.4' })
      const rec = '0x' + eRec

      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainEDnsHash, 1)).to.equal('0x' + eRec)
    })

    it('DNS-005 forbids setting DNS records by non-owners', async function (this: Context) {
      // f.test.country. 3600 IN A 1.2.3.4
      const fRec = dns.encodeARecord({ name: TestSubdomainF, ipAddress: '1.2.3.4' })
      const rec = '0x' + fRec
      await expect(
        this.publicResolver.connect(this.bob).setDNSRecords(TestNode, rec)
      ).to.be.reverted
    })

    it('DNS-006 permits setting zonehash by owner', async function (this: Context) {
      expect(await this.publicResolver.zonehash(TestNode)).to.equal(zoneHashWithOffset(1))
    })

    it('DNS-007 can overwrite previously set zonehash', async function (this: Context) {
      await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(2)
      )
      expect(await this.publicResolver.zonehash(TestNode))
        .to.equal(zoneHashWithOffset(2))
    })

    it('DNS-008 can overwrite to same zonehash', async function (this: Context) {
      await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(1),
        { from: this.alice.address }
      )
      expect(
        await this.publicResolver.zonehash(TestNode),
        zoneHashWithOffset(1)
      )
    })

    it('DNS-009 forbids setting zonehash by non-owners', async function (this: Context) {
      await expect(
        this.publicResolver.connect(this.bob).setZonehash(
          TestNode,
          zoneHashWithOffset(2)
        )
      ).to.be.reverted
    })

    it('DNS-010 forbids writing same zonehash by non-owners', async function (this: Context) {
      await expect(
        this.publicResolver.connect(this.bob).setZonehash(
          TestNode,
          zoneHashWithOffset(1)
        )
      ).to.be.reverted
    })

    it('DNS-011 returns empty when fetching nonexistent zonehash', async function () {
      // TODO move initialization in before each to a function
      // TODO see if we can delete a zonehash
      //   expect(await this.publicResolver.zonehash(node)).to.equal(null)
    })

    it('DNS-012 emits the correct event', async function (this: Context) {
      let tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(2)
      )
      let receipt = await tx.wait()
      expect(receipt.events?.length).to.equal(1)
      expect(receipt.events?.[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events?.[0].args?.[0]).to.equal(TestNode)
      expect(receipt.events?.[0].args?.[1]).to.equal(
        zoneHashWithOffset(1)
      )
      expect(
        receipt.events?.[0].args?.zonehash).to.equal(
        zoneHashWithOffset(2)
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(3)
      )
      receipt = await tx.wait()
      expect(receipt.events?.length).to.equal(1)
      expect(receipt.events?.[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events?.[0].args?.[0]).to.equal(TestNode)
      expect(receipt.events?.[0].args?.[1]).to.equal(
        zoneHashWithOffset(2)
      )
      expect(
        receipt.events?.[0].args?.zonehash).to.equal(
        zoneHashWithOffset(3)
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset()
      )
      receipt = await tx.wait()
      //   console.log(`receipt: ${JSON.stringify(receipt)}`)
      expect(receipt.events?.length).to.equal(1)
      expect(receipt.events?.[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events?.[0].args?.[0]).to.equal(TestNode)
      expect(
        receipt.events?.[0].args?.[1]).to.equal(
        zoneHashWithOffset(3)
      )
      expect(
        receipt.events?.[0].args?.[2]).to.equal(
        zoneHashWithOffset()
      )
    })

    it('DNS-013 resets dnsRecords on version change', async function (this: Context) {
      await this.publicResolver.connect(this.alice).clearRecords(TestNode)
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, Constants.DNSRecordType.A)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, Constants.DNSRecordType.A)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, Constants.DNSRecordType.SOA)).to.equal(
        '0x'
      )
    })

    it('DNS-014 resets zonehash on version change', async function (this: Context) {
      await this.publicResolver.connect(this.alice).clearRecords(TestNode)
      expect(await this.publicResolver.zonehash(TestNode)).to.equal('0x')
    })

    it('DNS-015 should handle TXT record updates', async function (this: Context) {
      // test.country. SampleText
      const txtRec = dns.encodeTXTRecord({ name: TestDomainFqdn, text: 'SampleText' })
      const rec = '0x' + txtRec

      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

      expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, 16)).to.equal('0x' + txtRec)
    })
  })
})
