/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { Constants, contracts, deployAll, dns } from '../utilities'
import namehash from 'eth-ens-namehash'
import { TestContext } from '../utilities/types'

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
  return Buffer.from(r).toString('hex')
}

describe('DNS Tests', function () {
  const ONE_ETH = ethers.utils.parseEther('1')
  const TLD = process.env.TLD || 'country'
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
  const [initARec] = dns.encodeARecord(TestSubdomainA, '1.2.3.4')
  // b.test.country. 3600 IN A 2.3.4.5
  const [initB1Rec] = dns.encodeARecord(TestSubdomainB, '2.3.4.5')
  // b.test.country. 3600 IN A 3.4.5.6
  const [initB2Rec] = dns.encodeARecord(TestSubdomainB, '3.4.5.6')
  // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061501 15620 1800 1814400 14400
  const DefaultSOA = {
    primary: 'ns1.countrydns.xyz.',
    admin: 'hostmaster.test.country',
    serial: 2018061501,
    refresh: 15620,
    retry: 1800,
    expiration: 1814400,
    minimum: 14400
  }
  const [initSOARec] = dns.encodeSOARecord(TestDomainFqdn, DefaultSOA)
  const [initCNAMERec] = dns.encodeCNAMERecord('one.test.country', 'harmony.one')
  const initRec = '0x' + initARec + initB1Rec + initB2Rec + initSOARec + initCNAMERec

  before(async function () {
    this.beforeSnapshotId = await waffle.provider.send('evm_snapshot', [])
    const context = this as TestContext
    await contracts.prepare(context) // get the signers
    await deployAll.deploy(context)

    // register test.country
    const duration = ethers.BigNumber.from(30 * 24 * 3600)
    const secret = Constants.EMPTY_BYTES32
    const callData = []
    const reverseRecord = false
    const fuses = ethers.BigNumber.from(0)
    const wrapperExpiry = ethers.BigNumber.from(new Uint8Array(8).fill(255)).toString()
    const commitment = await context.registrarController.connect(context.alice).makeCommitment(
      TestDomain,
      context.alice.address,
      duration,
      secret,
      context.publicResolver.address,
      callData,
      reverseRecord,
      fuses,
      wrapperExpiry
    )
    let tx = await context.registrarController.connect(context.alice).commit(commitment)
    await tx.wait()
    tx = await context.registrarController.register(
      TestDomain,
      context.alice.address,
      duration,
      secret,
      context.publicResolver.address,
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
    console.log('==========')
    console.log('Initializing a.test.country')
    console.log('node: test.country')
    console.log(`nodeHash: ${TestNode}`)
    console.log(`0x + initARec: ${'0x' + initARec}`)
    tx = await context.publicResolver.connect(context.alice).setDNSRecords(TestNode, '0x' + initARec)
    await tx.wait()
    tx = await context.publicResolver.connect(context.alice).setDNSRecords(TestNode, initRec)
    await tx.wait()
    // Set initial zonehash
    expect(await context.publicResolver.zonehash(TestNode)).to.equal('0x')
    tx = await context.publicResolver.connect(context.alice).setZonehash(
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
    it('DNS-001 permits setting name by owner', async function () {
      // Test Ownership via ENSRegistry
      console.log(`DNS-001: node: ${TestNode}`)
      console.log(`DNS-001: nodeArrayify: ${ethers.utils.arrayify(TestNode)}`)
      console.log('ETH_NODE: 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae')
      expect('0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae').to.equal(namehash.hash('eth'))
      expect(await this.nameWrapper.TLD_NODE()).to.equal(namehash.hash('country'))
      expect(await this.ens.owner(TestNode)).to.equal(this.nameWrapper.address)
      expect(await this.baseRegistrar.ownerOf(ethers.BigNumber.from(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')))))).to.equal(this.nameWrapper.address)
      const testxyzNode = namehash.hash('textxyz' + '.' + TLD)
      // test an unregistered node
      expect(await this.ens.owner(testxyzNode)).to.equal(Constants.ZERO_ADDRESS)
      //   await expect(this.baseRegistrar.ownerOf(ethers.BigNumber.from(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('testxyz')))))).to.be.reverted
      expect(await this.baseRegistrar.ownerOf(ethers.BigNumber.from(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('testxyz')))))).to.equal(Constants.ZERO_ADDRESS)
      // Test Ownership via DNSResolver by seeing that alice's updates were succesfull
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, Constants.DNSRecordType.A)).to.equal('0x' + initARec)
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, Constants.DNSRecordType.A)).to.equal('0x' + initB1Rec + initB2Rec)
      expect(await this.publicResolver.dnsRecord(TestNode, oneNameHash, Constants.DNSRecordType.CNAME)).to.equal('0x' + initCNAMERec)
      expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, Constants.DNSRecordType.SOA)).to.equal('0x' + initSOARec)
    })

    it('DNS-002 should update existing records', async function () {
      // a.test.country. 3600 IN A 4.5.6.7 (changing address)
      const [initARec] = dns.encodeARecord(TestSubdomainA, '4.5.6.7')
      // country. 86400 IN SOA ns1.countrydns.xyz. hostmaster.test.country. 2018061502 15620 1800 1814400 14400 (changing serial)
      const [soinitARec] = dns.encodeSOARecord(TestDomainFqdn, { ...DefaultSOA, serial: 2018061502 })
      const rec = '0x' + initARec + soinitARec
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, Constants.DNSRecordType.A)).to.equal('0x' + initARec)
      expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, Constants.DNSRecordType.SOA)).to.equal('0x' + soinitARec)

      // unchanged records still exist
      // b.test.country. 3600 IN A 2.3.4.5
      const [initB1Rec] = dns.encodeARecord(TestSubdomainB, '2.3.4.5')
      // b.test.country. 3600 IN A 3.4.5.6
      const [initB2Rec] = dns.encodeARecord(TestSubdomainB, '3.4.5.6')
      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, Constants.DNSRecordType.A)).to.equal('0x' + initB1Rec + initB2Rec)
    })

    it('DNS-003 should keep track of entries', async function () {
      // c.test.country. 3600 IN A 1.2.3.4
      const [cRec] = dns.encodeARecord(TestSubdomainC, '1.2.3.4')
      const rec = '0x' + cRec
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

      // Initial check
      let hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      expect(hasEntries).to.be.true
      hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainDDnsHash)
      expect(hasEntries).to.be.false

      // Update with no new data makes no difference
      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)
      hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      expect(hasEntries).to.be.true

      // c.test.country. 3600 IN A
      const [cRec2] = dns.encodeARecord(TestSubdomainC, '')
      const rec2 = '0x' + cRec2

      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec2)

      // Removal returns to 0
      hasEntries = await this.publicResolver.hasDNSRecords(TestNode, TestSubdomainCDnsHash)
      expect(hasEntries).to.be.false
    })

    it('DNS-004 should handle single-record updates', async function () {
      // e.test.country. 3600 IN A 1.2.3.4
      const [eRec] = dns.encodeARecord(TestSubdomainE, '1.2.3.4')
      const rec = '0x' + eRec

      await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

      expect(await this.publicResolver.dnsRecord(TestNode, TestSubdomainEDnsHash, 1)).to.equal('0x' + eRec)
    })

    it('DNS-005 forbids setting DNS records by non-owners', async function () {
      // f.test.country. 3600 IN A 1.2.3.4
      const [fRec] = dns.encodeARecord(TestSubdomainF, '1.2.3.4')
      const rec = '0x' + fRec
      await expect(
        this.publicResolver.connect(this.bob).setDNSRecords(TestNode, rec)
      ).to.be.reverted
    })

    it('DNS-006 permits setting zonehash by owner', async function () {
      expect(await this.publicResolver.zonehash(TestNode)).to.equal(zoneHashWithOffset(1))
    })

    it('DNS-007 can overwrite previously set zonehash', async function () {
      await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(2)
      )
      expect(await this.publicResolver.zonehash(TestNode))
        .to.equal(zoneHashWithOffset(2))
    })

    it('DNS-008 can overwrite to same zonehash', async function () {
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

    it('DNS-009 forbids setting zonehash by non-owners', async function () {
      await expect(
        this.publicResolver.connect(this.bob).setZonehash(
          TestNode,
          zoneHashWithOffset(2)
        )
      ).to.be.reverted
    })

    it('DNS-010 forbids writing same zonehash by non-owners', async function () {
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

    it('DNS-012 emits the correct event', async function () {
      let tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(2)
      )
      let receipt = await tx.wait()
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(TestNode)
      expect(receipt.events[0].args[1]).to.equal(
        zoneHashWithOffset(1)
      )
      expect(
        receipt.events[0].args.zonehash).to.equal(
        zoneHashWithOffset(2)
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset(3)
      )
      receipt = await tx.wait()
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(TestNode)
      expect(receipt.events[0].args[1]).to.equal(
        zoneHashWithOffset(2)
      )
      expect(
        receipt.events[0].args.zonehash).to.equal(
        zoneHashWithOffset(3)
      )

      tx = await this.publicResolver.connect(this.alice).setZonehash(
        TestNode,
        zoneHashWithOffset()
      )
      receipt = await tx.wait()
      //   console.log(`receipt: ${JSON.stringify(receipt)}`)
      expect(receipt.events.length).to.equal(1)
      expect(receipt.events[0].event).to.equal('DNSZonehashChanged')
      expect(receipt.events[0].args[0]).to.equal(TestNode)
      expect(
        receipt.events[0].args[1]).to.equal(
        zoneHashWithOffset(3)
      )
      expect(
        receipt.events[0].args[2]).to.equal(
        zoneHashWithOffset()
      )
    })

    it('DNS-013 resets dnsRecords on version change', async function () {
      await this.publicResolver.connect(this.alice).clearRecords(TestNode)
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestSubdomainADnsHash, 1)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestSubdomainBDnsHash, 1)).to.equal(
        '0x'
      )
      expect(
        await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, 6)).to.equal(
        '0x'
      )
    })

    it('DNS-014 resets zonehash on version change', async function () {
      await this.publicResolver.connect(this.alice).clearRecords(TestNode)
      expect(await this.publicResolver.zonehash(TestNode)).to.equal('0x')
    })
  })

  it('DNS-015 should handle TXT record updates', async function () {
    // test.country. SampleText
    const [txtRec] = dns.encodeTXTRecord(TestDomainFqdn, 'SampleText')
    const rec = '0x' + txtRec

    await this.publicResolver.connect(this.alice).setDNSRecords(TestNode, rec)

    expect(await this.publicResolver.dnsRecord(TestNode, TestDomainFqdnHash, 16)).to.equal('0x' + txtRec)
  })
})
