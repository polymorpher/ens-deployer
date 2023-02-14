# ens-deployer

1NS related contract deployment, customized based on ENS contracts. These contracts are required for `.country` and `.1.country` systems 

## Quick start

1. Setup

```
git clone https://github.com/polymorpher/ens-deployer
cd ens-deployer
cd contract
yarn install
cp env.sample .env
# Update .env with your testnet and mainnet mnemonics
```

2. Start ganache locally

```
cd env
./ganche-new.sh
```

3. Deploy locally

```
cd contract
yarn deploy
```

*Note: `ganache-new.sh` deletes the database every time it runs, which provides a fresh state. A hard-coded mnemonic is provided, which is also compatible with MetaMask.

* If you want to keep the state of ganache use `./ganache-restart`.