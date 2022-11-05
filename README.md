# ens-deployer

ENS Deployer for Harmony

## Quick start

Setup
```
# Setup
git clone https://github.com/polymorpher/ens-deployer
cd ens-deployer
cd contract
yarn  
cp env.sample .env
# Update .env with your testnet and mannet mnemonics"
cd ..
```

Start ganache locally (terminal window 1)
```
cd env
./ganche-new.sh
```

Deploy locally (terminal window 2)
```
cd contract
yarn deploy
```
