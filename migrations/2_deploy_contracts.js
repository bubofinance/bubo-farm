const { BigNumber } = require("@ethersproject/bignumber");
const MasterChef = artifacts.require("MasterChef");
const SousChef = artifacts.require("SousChef");
const CakeToken = artifacts.require("CakeToken");
const SyrupBar = artifacts.require("SyrupBar");
const Multicall = artifacts.require("Multicall");
const Timelock = artifacts.require("Timelock");

const INITIAL_MINT = '25000';
const BLOCKS_PER_HOUR = (3600 / 3) // 3sec Block Time
const TOKENS_PER_BLOCK = '10';
const BLOCKS_PER_DAY = 24 * BLOCKS_PER_HOUR
const TIMELOCK_DELAY_SECS = (3600 * 24); 
const STARTING_BLOCK = 6194417;
const REWARDS_START = String(STARTING_BLOCK + (BLOCKS_PER_HOUR * 6))
const FARM_FEE_ACCOUNT = ''
 
const logTx = (tx) => {
    console.dir(tx, {depth: 3});
}

// let block = await web3.eth.getBlock("latest")
module.exports = async function(deployer, network, accounts) {
    console.log({network});

    let currentAccount = accounts[0];
    let feeAccount = FARM_FEE_ACCOUNT;
    if (network == 'testnet') {
        console.log(`WARNING: Updating current account for testnet`)
        currentAccount = accounts[1];
    }

    if (network == 'development' || network == 'testnet') {
        console.log(`WARNING: Updating feeAcount for testnet/development`)
        feeAccount = accounts[3];
    }

    let cakeTokenInstance;
    let syrupBarInstance;
    let masterChefInstance;

    /**
     * Deploy CakeToken
     */
    deployer.deploy(CakeToken).then((instance) => {
        cakeTokenInstance = instance;
        /**
         * Mint intial tokens for liquidity pool
         */
        return cakeTokenInstance.mint(BigNumber.from(INITIAL_MINT).mul(BigNumber.from(String(10**18))));
    }).then((tx)=> {
        logTx(tx);
        /**
         * Deploy SyrupBar
         */
        return deployer.deploy(SyrupBar, CakeToken.address)
    }).then((instance)=> {
        syrupBarInstance = instance;
        /**
         * Deploy MasterChef
         */
        if(network == "bsc" || network == "bsc-fork") {
            console.log(`Deploying MasterChef with BSC MAINNET settings.`)
            return deployer.deploy(MasterChef, 
                CakeToken.address,                                                      // _Cake
                SyrupBar.address,                                                       // _bananaSplit
                feeAccount,                                                             // _devaddr
                BigNumber.from(TOKENS_PER_BLOCK).mul(BigNumber.from(String(10**18))),   // _cakePerBlock
                REWARDS_START                                                           // _startBlock
                                                                                        // _multiplier
            )
        }
        console.log(`Deploying MasterChef with DEV/TEST settings`)
        return deployer.deploy(MasterChef, 
            CakeToken.address, 
            SyrupBar.address, 
            feeAccount,
            BigNumber.from(TOKENS_PER_BLOCK).mul(BigNumber.from(String(10**18))), 
            0 
            
        )
        
    }).then((instance)=> {
        masterChefInstance = instance;
        /**
         * TransferOwnership of CAKE to MasterChef
         */
        return cakeTokenInstance.transferOwnership(MasterChef.address);
    }).then((tx)=> {
        logTx(tx);
        /**
         * TransferOwnership of BANANASPLIT to MasterChef
         */
        return syrupBarInstance.transferOwnership(MasterChef.address);
    }).then((tx)=> {
        logTx(tx);
        /**
         * Deploy SousChef
         */
        if(network == "bsc" || network == "bsc-fork") {
            console.log(`Deploying SousChef with BSC MAINNET settings.`)
            return deployer.deploy(SousChef, 
                SyrupBar.address,                                                       //_bananaSplit
                BigNumber.from(TOKENS_PER_BLOCK).mul(BigNumber.from(String(10**18))),   // _rewardPerBlock
                REWARDS_START,                                                          // _startBlock
                STARTING_BLOCK + (BLOCKS_PER_DAY * 365),                                // _endBlock
            )
        }
        console.log(`Deploying SousChef with DEV/TEST settings`)
        return deployer.deploy(SousChef, 
            SyrupBar.address,                                                            //_bananaSplit
            BigNumber.from(TOKENS_PER_BLOCK).mul(BigNumber.from(String(10**18))),        // _rewardPerBlock
            STARTING_BLOCK + (BLOCKS_PER_HOUR * 6),                                      // _startBlock
            '99999999999999999',                                                         // _endBlock
        )
    }).then(()=> {
        /**
         * Deploy Multicall
         */
        return deployer.deploy(Multicall);
    }).then(()=> {
        /**
         * Deploy Timelock
         */
        return deployer.deploy(Timelock, currentAccount, TIMELOCK_DELAY_SECS);
    }).then(()=> {
        console.log('Rewards Start at block: ', REWARDS_START)
        console.table({
            MasterChef:MasterChef.address,
            SousChef:SousChef.address,
            CakeToken:CakeToken.address,
            SyrupBar:SyrupBar.address,
            Multicall:Multicall.address,
            Timelock:Timelock.address,
        })
    });
};
