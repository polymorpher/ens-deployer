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

*Note: The default is to delete the ganache database and not save deployments for the local network. This allows us to start with a fresh local ganache instance each time. We also use a hardcoded mnemonic which is helpful if you want to test integration with metamask as you can set up the wallet once rather than having to setup the metamask wallet each time based on randomly generated accounts*

* If you want to keep the state of ganache use `./ganache-restart`.
* If you want to test redeployments locally update `hardhat.config.ts` setting the `local` network to `saveDeployments: true`