// TODO replace with ethers providers
// https://ethereum.stackexchange.com/questions/86633/time-dependent-tests-with-hardhat
const util = require('util')

const advanceTime = util.promisify(function (delay, done) {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [delay]
  }, done)
})

const mine = util.promisify(function (done) {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine'
  }, done)
})

module.exports = {
  advanceTime, mine
}
