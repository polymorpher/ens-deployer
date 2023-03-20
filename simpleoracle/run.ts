import * as dotenv from 'dotenv'
import * as ethers from 'ethers'
import axios from 'axios'
import SimpleAssetPriceOracleAbi from '../contract/abi/SimpleAssetPriceOracle.json'
import { SimpleAssetPriceOracle } from '../contract/typechain-types'

dotenv.config()

const USD_ORACLE_ADDRESS = process.env.USD_ORACLE_ADDRESS as string
const provider = new ethers.providers.StaticJsonRpcProvider(process.env.PROVIDER)
const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string).connect(provider)
async function loop () {
  const { data } = await axios.get('https://api.binance.us/api/v3/ticker/24hr?symbol=ONEUSDT')
  const price = data?.lastPrice
  if (!price) {
    console.error('Cannot retrieve price from Binance. Response: ', data)
    return
  }
  const c = new ethers.Contract(USD_ORACLE_ADDRESS, SimpleAssetPriceOracleAbi, signer) as SimpleAssetPriceOracle
  const p = parseFloat((await c.latestAnswer()).toString())
  const latest = parseFloat(price) * 1e+9
  const changeRatio = (latest - p) / p
  if (Math.abs(changeRatio) < 0.00) {
    console.log(`Change ratio (${changeRatio}) too small, skipping; Latest price: ${price}; Contract price ${p / 1e+9}`)
    return
  }
  try {
    console.log(`Updating contract price to ${latest.toFixed(0)} (=$${price})`)
    await c.set(latest.toFixed(0))
  } catch (ex) {
    console.error('Failed to set price on contract')
    console.error(ex)
  }
}

function main () {
  setInterval(loop, parseInt(process.env.LOOP_INTERVAL as string))
}

main()
