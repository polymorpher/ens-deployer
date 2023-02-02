// export const Constants = require('./constants')
import { Constants } from './constants'
import * as contracts from './contracts'
import * as deployAll from './deployAll'
import * as dns from './dns'
import * as ens from './ens'
import * as exceptions from './exceptions'
import * as reverse from './reverse'
import * as utils from './utils'

export {
  Constants,
  contracts,
  deployAll,
  dns,
  ens,
  exceptions,
  reverse,
  utils
}

// // export const Constants
// module.exports = {
//   Constants

// //   exceptions: require('./exceptions.ts'),
// //   evm: require('./evm.ts'),
// //   dns: require('./dns.ts'),
// //   ens: require('./ens.ts'),
// //   reverse: require('./reverse.ts'),
// //   contracts: require('./contracts.ts')
// }
