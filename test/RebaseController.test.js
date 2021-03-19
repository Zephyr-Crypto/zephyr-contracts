const { expect } = require("chai");
const { ethers } = require("hardhat");

return;

function big(number) {
    return ethers.BigNumber.from(number);
}

function diff(a, b) {
    return Math.max(a, b) - Math.min(a, b);
}

async function mine() {
    await ethers.provider.send("evm_mine");
}

async function increaseNextBlockTimestamp(interval) {
    await ethers.provider.send("evm_increaseTime", [interval]);
}

async function setNextBlockTimestamp(timestamp) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
}

async function blockNumber() {
    return await ethers.provider.getBlockNumber();
}

async function blockTimestamp() {
    let t;
    let b = await ethers.provider.getBlockNumber();
    await ethers.provider.getBlock(b).then((block) => {
        t = block.timestamp;
    });
    return t;
}

async function wait(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
}

describe("REBASE CONTROLLER", () => {

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const ONE_DAY = big(86400);
    const REBASE_INTERVAL = big(82800);
    const DECIMALS = big(9);
    const INITIAL_BALANCE = big(500000).mul(10**DECIMALS);

    let tokenfactory;
    let ratesfactory;
    let contractFactory;
    let poolFactory;
    
    let token;
    let contract;
    let rates;
    let pool;

    let owner;
    let user1;
    let user2;
    let users;

    beforeEach(async () => {

        [owner, user1, user2, ...users] = await ethers.getSigners();

        tokenfactory = await ethers.getContractFactory("Zephyr");
        token = await tokenfactory.deploy();

        contractFactory = await ethers.getContractFactory("RebaseController");
        contract = await contractFactory.deploy();

        ratesfactory = await ethers.getContractFactory("MockUniswapRates");
        rates = await ratesfactory.deploy();

        poolFactory = await ethers.getContractFactory("MockUniswapPool");
        pool = await poolFactory.deploy();        

    });

    describe("Deployment", () => {
        describe("When the contract is deployed...", () => {
            it("Owner should be set correctly", async () => {
                expect(await contract.owner()).to.equal(owner.address);
            });
        });
    });

    describe("setRebaseToken()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._rebaseToken()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setRebaseToken(token.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._rebaseToken()).to.equal(ZERO_ADDRESS);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The token address should be set correctly", async () => {
                expect(await contract._rebaseToken()).to.equal(ZERO_ADDRESS);
                await contract.setRebaseToken(token.address);
                expect(await contract._rebaseToken()).to.equal(token.address);
            });
        });
    });

    describe("setUniswapPool()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._uniswapPool()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setUniswapPool(pool.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._uniswapPool()).to.equal(ZERO_ADDRESS);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The uniswap pool address should be set correctly", async () => {
                expect(await contract._uniswapPool()).to.equal(ZERO_ADDRESS);
                await contract.setUniswapPool(pool.address);
                expect(await contract._uniswapPool()).to.equal(pool.address);
            });
        });
    });

    describe("setUniswapRates()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._uniswapRates()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setUniswapRates(rates.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._uniswapRates()).to.equal(ZERO_ADDRESS);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The uniswap rates address should be set correctly", async () => {
                expect(await contract._uniswapRates()).to.equal(ZERO_ADDRESS);
                await contract.setUniswapRates(rates.address);
                expect(await contract._uniswapRates()).to.equal(rates.address);
            });
        });
    });

    describe("setInterval()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._interval()).to.equal(REBASE_INTERVAL);
                await expect(contract.connect(user1).setInterval(100)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._interval()).to.equal(REBASE_INTERVAL);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The interval should be set correctly", async () => {
                expect(await contract._interval()).to.equal(REBASE_INTERVAL);
                await contract.setInterval(100);
                expect(await contract._interval()).to.equal(100);
            });
        });
    });

    describe("setRewardRounds()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._rewardRounds()).to.equal(20000);
                await expect(contract.connect(user1).setRewardRounds(10000)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._rewardRounds()).to.equal(20000);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The reward rounds should be set correctly", async () => {
                expect(await contract._rewardRounds()).to.equal(20000);
                await contract.setRewardRounds(10000);
                expect(await contract._rewardRounds()).to.equal(10000);
            });
        });
    });

    describe("setMaxRewardMultiplier()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._maxRewardMultiplier()).to.equal(100);
                await expect(contract.connect(user1).setMaxRewardMultiplier(1000)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._maxRewardMultiplier()).to.equal(100);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The max reward multiplier should be set correctly", async () => {
                expect(await contract._maxRewardMultiplier()).to.equal(100);
                await contract.setMaxRewardMultiplier(1000);
                expect(await contract._maxRewardMultiplier()).to.equal(1000);
            });
        });
    });

    describe("setEcosystemPool()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setEcosystemPool(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The ecosystem address should be set correctly", async () => {
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await contract.setEcosystemPool(user1.address);
                expect(await contract._ecosystem()).to.equal(user1.address);
            });
        });
    });

    describe("conclude()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.connect(user1).conclude()).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
        describe("When the token address has not been set...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.conclude()).to.be.revertedWith("Rebase Controller: The rebase token address has not been set");
            });
        });
        describe("When The ecosystem address has not been set...", () => {
            it("Transaction should revert", async () => {
                await contract.setRebaseToken(token.address);
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await expect(contract.conclude()).to.be.revertedWith("Rebase Controller: The ecosystem pool address has not been set");
            });
        });
        describe("When The ecosystem address has been set...", () => {
            beforeEach(async () => {
                await contract.setRebaseToken(token.address);
                await contract.setEcosystemPool(user1.address);
                await token.transfer(contract.address, INITIAL_BALANCE);
            });
            it("The remaining balance should transfer over to the ecosystem pool", async () => {
                const initialEcosystemBalance = await token.balanceOf(user1.address);
                const initialContractBalance = await token.balanceOf(contract.address);
                await contract.conclude();
                expect(await token.balanceOf(user1.address)).to.equal(initialEcosystemBalance.add(initialContractBalance));
                expect(await token.balanceOf(contract.address)).to.equal(initialContractBalance.sub(initialContractBalance));
            });
        });
    });

    describe("secondsUntilRebase()", () => {
        beforeEach(async () => {
            await contract.setRebaseToken(token.address);
            await contract.setUniswapPool(pool.address);
            await contract.setUniswapRates(rates.address);
            await token.setRebaseController(contract.address);
        });
        describe("When there is time remaining before the next rebase...", () => {
            it("The correct time remaining should be returned", async () => {
                await contract.rebase();
                await wait(41400);
                expect(await contract.secondsUntilRebase()).to.equal(41400);
            });
        });
        describe("When there is no time remaining before the next rebase...", () => {
            it("The correct time remaining should be returned", async () => {
                await contract.rebase();
                await wait(100000);
                expect(await contract.secondsUntilRebase()).to.equal(0);
            });
        });
    });

    describe("getBaseReward()", () => {
        beforeEach(async () => {
            await contract.setRebaseToken(token.address);
        });
        describe("When the contract does not have a balance...", () => {
            it("Function should return zero", async () => {
                expect(await contract.getBaseReward()).to.equal(0);
            });
        });
        describe("When the contract does have a balance...", () => {
            beforeEach(async () => {
                await token.transfer(contract.address, INITIAL_BALANCE);
            });
            describe("When there are no reward rounds remaining...", () => {
                it("Function should return zero", async () => {
                    await contract.setRewardRounds(0);
                    expect(await contract.getBaseReward()).to.equal(0);
                });
            });
            describe("When there are reward rounds remaining...", () => {
                it("Function should return the correct base reward", async () => {
                    const rounds = await contract._rewardRounds();
                    const balance = await contract.currentBalance();
                    expect(await contract.getBaseReward()).to.equal(balance.div(rounds));
                });
            });
        });
    });

    describe("getCurrentExchangeRate()", () => {

        it("Transaction should revert if no rates contract has been set", async () => {
            await expect(contract.getCurrentExchangeRate()).to.be.reverted;
        });

        it("Should return the correct values from the mock rates contract", async () => {
            
            await contract.setUniswapRates(rates.address);
            
            expect(await contract.getCurrentExchangeRate()).to.equal(100000000);

            await rates.add(1000);
            expect(await contract.getCurrentExchangeRate()).to.equal(100001000);

            await rates.sub(500);
            expect(await contract.getCurrentExchangeRate()).to.equal(100000500);

        });

    });

    describe("getSupplyDelta()", () => {

        let totalSupply;
        let supplyDelta;

        beforeEach(async () => {
            await token.setRebaseController(contract.address);
            await contract.setRebaseToken(token.address);
            await contract.setUniswapPool(pool.address);
            await contract.setUniswapRates(rates.address);
            await contract.rebase();
            totalSupply = await token.totalSupply();
            supplyDelta = totalSupply.div(100);
        });

        it("No exchange rate difference should return a supply delta of zero", async () => {
            expect(await contract.getSupplyDelta(100000000)).to.equal(0);
            //console.log((await contract.callStatic.getSupplyDelta(0)).toString());
        });

        it("Positive exchange rate difference >1% should return a positive supply delta", async () => {
            expect(await contract.getSupplyDelta(600000000)).to.equal(supplyDelta);
            //console.log((await contract.callStatic.getSupplyDelta(100)).toString());
        });

        it("Negative exchange rate difference >1% should return a negative supply delta", async () => {
            expect(await contract.getSupplyDelta(40000000)).to.equal(-supplyDelta);
            //console.log((await contract.callStatic.getSupplyDelta(-100)).toString());
        });

    });

    describe("syncLiquidityPools()", () => {

        it("Transaction should revert if no pool address has been set", async () => {
            await expect(contract.syncLiquidityPools()).to.be.reverted;
        });

        it("Transaction should succeed if pool has been set", async () => {
            await contract.setUniswapPool(pool.address);
            await expect(contract.syncLiquidityPools()).to.not.be.reverted;
        });

    });

    describe("rebase()", () => {

        describe("When all requirements have not been met to call rebase...", () => {

            describe("When no rebaseable token address has been set...", () => {
                it("Rebase transactions should revert", async () => {
                    await expect(contract.rebase()).to.be.revertedWith("Rebase Controller: Rebase Token can't be the zero address");
                });
            });

            describe("When no Uniswap Pool address has been set...", () => {
                it("Rebase transactions should revert", async () => {
                    await contract.setRebaseToken(token.address);
                    await expect(contract.rebase()).to.be.revertedWith("Rebase Controller: Uniswap Pool can't be the zero address");
                });
            });

            describe("When no Uniswap Rates contract has been set...", () => {
                it("Rebase transactions should revert", async () => {
                    await contract.setRebaseToken(token.address);
                    await contract.setUniswapPool(pool.address);
                    await expect(contract.rebase()).to.be.revertedWith("Rebase Controller: Uniswap Rates can't be the zero address");
                });
            });

            describe("When the contract address has not been set on the Zephyr contract...", () => {
                it("Rebase transactions should revert", async () => {
                    await contract.setRebaseToken(token.address);
                    await contract.setUniswapPool(pool.address);
                    await contract.setUniswapRates(rates.address);
                    await expect(contract.rebase()).to.be.revertedWith("Zephyr: Function can only be called by the Rebase Controller");
                });
            });

            describe("When the interval for rebase has not passed...", () => {
                it("Transaction should revert", async() => {
                    await contract.setRebaseToken(token.address);
                    await contract.setUniswapPool(pool.address);
                    await contract.setUniswapRates(rates.address);
                    await token.setRebaseController(contract.address);

                    await contract.rebase();
                    await expect(contract.rebase()).to.be.revertedWith("Rebase Controller: Interval must pass before rebase can occur");
                })
            });

        });

        describe("When all requirements have been met to call rebase...", () => {

            beforeEach(async () => {
                await contract.setRebaseToken(token.address);
                await contract.setUniswapPool(pool.address);
                await contract.setUniswapRates(rates.address);
                await token.setRebaseController(contract.address);
            });

            it("First rebase should be positive, assuming price > 0", async () => {
                let totalSupply = await token.totalSupply();
                let supplyDelta = totalSupply.div(100);
                let newTotalSupply = totalSupply.add(supplyDelta);

                await contract.rebase();
                expect(await token.totalSupply()).to.equal(newTotalSupply);
                //console.log((await token.totalSupply()).toString());
            });

            it("Last rebase time should update correctly", async () => {
                
                await contract.rebase();

                expect(await contract._lastRebase()).to.equal(await blockTimestamp());

                await rates.add(100);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();

                expect(await contract._lastRebase()).to.equal(await blockTimestamp());

            });

            it("Last exchange rate should update correctly", async () => {

                let exchangeRate = await contract.getCurrentExchangeRate();

                await contract.rebase();

                expect(await contract._lastExchangeRate()).to.equal(exchangeRate);

                await rates.add(100);
                exchangeRate = await contract.getCurrentExchangeRate();

                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();

                await contract.rebase();
                
                expect(await contract._lastExchangeRate()).to.equal(exchangeRate);

            });

            it("Epoch should increase by 1", async () => {
                let epoch = await contract._epoch();
                await contract.rebase();
                expect(await contract._epoch()).to.equal(epoch.add(1));
            });

            it("Event for RebaseSuccess should be emitted", async () => {
                let lastExchangeRate = await contract._lastExchangeRate();
                let exchangeRate = await contract.getCurrentExchangeRate();
                let supplyDelta = await contract.getSupplyDelta(500000000);
                let epoch = await contract._epoch();

                await expect(contract.rebase())
                    .to.emit(contract, "RebaseSuccess")
                    .withArgs(lastExchangeRate, exchangeRate, supplyDelta, epoch.add(1));
            });

            it("User should receive a reward for rebasing", async () => {

                let balance;
                let reward;
                let supplyDelta;
                let rewardDelta;
                let rewardRounds;

                //The contract begins with 1,000,000 tokens
                balance = big(1000000).mul(10**DECIMALS);
                await token.transfer(contract.address, balance);
                expect(await token.balanceOf(contract.address)).to.equal(balance);

                //The first reward should be 50 tokens, assuming 20,000 reward rounds
                reward = big(50).mul(10**DECIMALS);
                rewardRounds = await contract._rewardRounds();
                expect(reward).to.equal(balance.div(rewardRounds));

                //GetBaseReward() should confirm this value as well
                expect(await contract.getBaseReward()).to.equal(reward);

                //User1 doesn't own any tokens to start with
                expect(await token.balanceOf(user1.address)).to.equal(0);

                //Rebase is going to alter the balances, so we need to know the deltas and updated balances
                supplyDelta = balance.div(100);
                rewardDelta = reward.div(100);
                reward = reward.add(rewardDelta);
                balance = balance.add(supplyDelta).sub(reward);

                //Now User1 rebases.  This will be a positive rebase to begin with.
                await expect(contract.connect(user1).rebase()).to.emit(contract, "RebaseReward").withArgs(user1.address, reward);
                
                //User1 should receive the base reward for calling rebase.
                expect(await token.balanceOf(contract.address)).to.equal(balance);
                expect(await token.balanceOf(user1.address)).to.equal(reward);
                expect(await contract._rewardMultiplier()).to.equal(2);

                //Increase price, get new balances
                await rates.add(1000000);
                balance = await contract.currentBalance();
                let baseReward = await contract.getBaseReward();
                let rewardMultipler = await contract._rewardMultiplier();
                reward = (baseReward).mul(rewardMultipler);
                let user1balance = await token.balanceOf(user1.address);

                supplyDelta = balance.div(100);
                rewardDelta = reward.div(100);
                let user1delta = user1balance.div(100);

                reward = reward.add(rewardDelta);
                balance = balance.add(supplyDelta).sub(reward);
                user1balance = user1balance.add(user1delta).add(reward);

                //User1 rebases again.  This will be another positive rebase.
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await expect(contract.connect(user1).rebase()).to.emit(contract, "RebaseReward").withArgs(user1.address, reward);

                //User1 should receive the base reward * 2 for calling rebase.
                expect(await token.balanceOf(contract.address)).to.equal(balance);
                expect(diff(await token.balanceOf(user1.address), user1balance)).to.be.lte(1);
                expect(await contract._rewardMultiplier()).to.equal(3);

            });

            it("Multiplier should not exceed 100", async () => {

                let multiplier;
                let balance = big(1000000).mul(10**DECIMALS);

                await token.transfer(contract.address, balance);

                for (let i = 1; i < 110; i++) {

                    multiplier = await contract._rewardMultiplier();
                    expect(multiplier).to.equal(i < 100 ? i : 100);

                    await rates.add(1000000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();

                    multiplier = await contract._rewardMultiplier();
                    expect(multiplier).to.equal(i < 100 ? i + 1 : 100);

                }

            });

            it("Extensive rebase testing (max supply delta)", async () => {

                //Positive rebase
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21210000000000000"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21422100000000000"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21636321000000000"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21852684210000000"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22071211052100000"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21850498941579000"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21631993952163210"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21415674012641578"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21629830752767993"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21846129060295672"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22064590350898628"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22285236254407614"));

                //Positive rebase
                await rates.add(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22508088616951690"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22283007730782174"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22060177653474353"));

                //Negative rebase
                await rates.sub(50000000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21839575876939610"));

            });

            describe("Testing pure supply delta", () => {
                beforeEach(async () => {
                    await contract.rebase();

                });
                it("0.1% positive rebase", async () => {
                    await rates.add(100000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21231210000000000"));
                });

                it("0.1% negative rebase", async () => {
                    await rates.sub(100000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21188790000000000"));
                });

                it("0.25% positive rebase", async () => {
                    await rates.add(250000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21263025000000000"));
                });

                it("0.25% negative rebase", async () => {
                    await rates.sub(250000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21156975000000000"));
                });

                it("0.5% positive rebase", async () => {
                    await rates.add(500000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21316050000000000"));
                });

                it("0.5% negative rebase", async () => {
                    await rates.sub(500000);
                    await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                    await mine();
                    await contract.rebase();
                    expect(await token.totalSupply()).to.equal(big("21103950000000000"));
                });
            })
            
            it("Extensive rebase testing (pure supply delta)", async () => {

                //Positive rebase
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21210000000000000"));

                //Positive rebase (10 cents)
                await rates.add(100000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21231210000000000"));

                //Positive rebase (20 cents)
                await rates.add(200000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21273630000000000"));

                //Positive rebase (30 cents)
                await rates.add(300000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21337260000000000"));

                //Positive rebase (40 cents)
                await rates.add(400000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21422100000000000"));

                //Negative rebase (10 cents)
                await rates.sub(100000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21400890000000000"));

                //Negative rebase (20 cents)
                await rates.sub(200000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21358470000000000"));

                //Negative rebase (30 cents)
                await rates.sub(300000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21294840000000000"));

                //Positive rebase (50 cents)
                await rates.add(500000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21400890000000000"));

                //Positive rebase (60 cents)
                await rates.add(600000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21528150000000000"));

                //Positive rebase (70 cents)
                await rates.add(700000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21676620000000000"));

                //Positive rebase (80 cents)
                await rates.add(800000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21846300000000000"));

                //Positive rebase (90 cents)
                await rates.add(900000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("22037190000000000"));

                //Negative rebase (40 cents)
                await rates.sub(400000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21952350000000000"));

                //Negative rebase (50 cents)
                await rates.sub(500000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21846300000000000"));

                //Negative rebase (60 cents)
                await rates.sub(600000);
                await increaseNextBlockTimestamp(ONE_DAY.toNumber());
                await mine();
                await contract.rebase();
                expect(await token.totalSupply()).to.equal(big("21719040000000000"));

            });

        });

    });

});
