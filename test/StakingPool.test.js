const { expect } = require("chai");
const { ethers } = require("hardhat");

return;

function big(number) {
    return ethers.BigNumber.from(number);
}

async function blockTimestamp() {
    let t;
    let b = await ethers.provider.getBlockNumber();
    await ethers.provider.getBlock(b).then((block) => {
        t = block.timestamp;
    });
    return t;
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

async function waitDays(days) {
    await ethers.provider.send("evm_increaseTime", [days * 86400]);
    await ethers.provider.send("evm_mine");
}

async function wait(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
}

describe("STAKING POOL", () => {

    const DECIMALS = big(9);
    const INITIAL_BALANCE = big(100000).mul(10**DECIMALS);
    const ONE_DAY = big(86400);
    const ONE_YEAR = ONE_DAY.mul(365);
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    //const ONE_UNI_TOKEN = big(1).mul(10**DECIMALS).mul(10**DECIMALS);
    const ONE_UNI_TOKEN = big("000000000333333333")
    const STAKE_AMOUNT = ONE_UNI_TOKEN;
    const TWO_UNI_TOKEN = big(2).mul(10**DECIMALS).mul(10**DECIMALS);
    const MAX_UINT256 = big("115792089237316195423570985008687907853269984665640564039457584007913129639935");

    let Contract;
    let contract;

    let Token;
    let token;

    let UniToken;
    let uniToken;

    let owner;
    let user1;
    let user2;
    let user3;
    let users;

    beforeEach(async () => {

        [owner, user1, user2, user3, ...users] = await ethers.getSigners();

        Token = await ethers.getContractFactory("Zephyr");
        token = await Token.deploy();

        UniToken = await ethers.getContractFactory("MockUniswapPool");
        uniToken = await UniToken.deploy();

        Contract = await ethers.getContractFactory("StakingPool");
        contract = await Contract.deploy();

        await token.setDevFeeEnabled(false);

    });

    describe("Deployment", () => {
        describe("When the contract is deployed...", () => {
            it("Owner should be set correctly", async () => {
                expect(await contract.owner()).to.equal(owner.address);
            });
        });
    });

    describe("setToken()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._token()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setToken(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._token()).to.equal(ZERO_ADDRESS);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The token should be set correctly", async () => {
                expect(await contract._token()).to.equal(ZERO_ADDRESS);
                await contract.setToken(token.address);
                expect(await contract._token()).to.equal(token.address);
            });
        });
    });

    describe("setUniToken()", () => {
        describe("When the caller is not the owner...", () => {
            it("The transaction should be reverted", async () => {
                expect(await contract._uniToken()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setUniToken(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._uniToken()).to.equal(ZERO_ADDRESS);
            });
            
        });
        describe("When the caller is the owner...", () => {
            it("The uniswap pool address should be set correctly", async () => {
                expect(await contract._uniToken()).to.equal(ZERO_ADDRESS);
                await contract.setUniToken(user1.address);
                expect(await contract._uniToken()).to.equal(user1.address);
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
            it("The ecosystem pool address should be set correctly", async () => {
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await contract.setEcosystemPool(user1.address);
                expect(await contract._ecosystem()).to.equal(user1.address);
            });
        });
    });

    describe("beginStakingPeriod()", () => {

        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.connect(user1).beginStakingPeriod(ONE_YEAR)).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
        describe("When the token has not been set...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.beginStakingPeriod(ONE_YEAR)).to.be.revertedWith("StakingPool: The reward token has not been set");
            });
        });
        describe("When the current reward balance is zero...", () => {
            it("Transaction should revert", async () => {
                await contract.setToken(token.address);
                await expect(contract.beginStakingPeriod(ONE_YEAR)).to.be.revertedWith("StakingPool: The token balance of the contract is zero");
            });
        });
        describe("When the reward balance is greater than zero...", () => {
            it("Staking period variables should be set correctly", async () => {
                await contract.setToken(token.address);
                await token.transfer(contract.address, INITIAL_BALANCE);
                await contract.beginStakingPeriod(ONE_YEAR);
                let timestamp = await blockTimestamp();
                expect(await contract._secondsInFullPeriod()).to.equal(ONE_YEAR);
                expect(await contract._timestampPeriodBegan()).to.equal(timestamp);
                expect(await contract._timestampPeriodEnds()).to.equal(big(timestamp).add(ONE_YEAR));
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
                await expect(contract.conclude()).to.be.revertedWith("StakingPool: The reward token has not been set");
            });
        });
        describe("When The ecosystem pool address has not been set...", () => {
            it("Transaction should revert", async () => {
                await contract.setToken(token.address);
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await expect(contract.conclude()).to.be.revertedWith("StakingPool: The ecosystem pool address has not been set");
            });
        });
        describe("When The ecosystem pool address has been set...", () => {
            beforeEach(async () => {
                await contract.setToken(token.address);
                await contract.setEcosystemPool(user1.address);
                await token.transfer(contract.address, INITIAL_BALANCE);
            });
            it("The remaining balance should transfer over to the ecosystem pool", async () => {
                const initialEcosystemBalance = await token.balanceOf(user1.address);
                const initialDistributionBalance = await token.balanceOf(contract.address);
                await contract.conclude();
                expect(await token.balanceOf(user1.address)).to.equal(initialEcosystemBalance.add(initialDistributionBalance));
                expect(await token.balanceOf(contract.address)).to.equal(initialDistributionBalance.sub(initialDistributionBalance));
            });
        });
    });

    describe("declareEmergency()", () => {
        beforeEach(async () => {
            await contract.setToken(token.address);
            await contract.setUniToken(uniToken.address);
            await contract.setEcosystemPool(user1.address);
            await token.transfer(contract.address, INITIAL_BALANCE);
            await contract.beginStakingPeriod(ONE_YEAR);
        });
        it("Should revert if state is not emergency", async () => {
            await expect(contract.emergencyUnstake()).to.be.revertedWith("StakingPool: Pool is not in a state of emergency");
            await expect(contract.emergencyRescue()).to.be.revertedWith("StakingPool: Pool is not in a state of emergency");
        });
        it("Emergency state should update properly", async () => {
            expect(await contract._emergency()).to.be.false;
            await contract.declareEmergency();
            expect(await contract._emergency()).to.be.true;
        });
        it("Staking and unstaking should be disabled", async () => {
            await contract.declareEmergency();
            await expect(contract.stake(ONE_UNI_TOKEN)).to.be.revertedWith("StakingPool: The staking pool is in a state of emergency");
            await expect(contract.unstake(ONE_UNI_TOKEN)).to.be.revertedWith("StakingPool: The staking pool is in a state of emergency");
        });
        it("User should be able to emergency unstake tokens", async () => {
            await uniToken.approve(contract.address, ONE_UNI_TOKEN);
            await contract.stake(ONE_UNI_TOKEN);

            await uniToken.transfer(user1.address, ONE_UNI_TOKEN);
            await uniToken.connect(user1).approve(contract.address, ONE_UNI_TOKEN);
            await contract.connect(user1).stake(ONE_UNI_TOKEN);

            let balance = await uniToken.balanceOf(owner.address);
            let balanceUser1 = await uniToken.balanceOf(user1.address);

            expect(await contract.globalAmountStaked()).to.equal(ONE_UNI_TOKEN.mul(2));
            await contract.declareEmergency();
            
            await contract.emergencyUnstake();
            expect(await contract.amountStaked(owner.address)).to.equal(0);
            expect(await contract.globalAmountStaked()).to.equal(ONE_UNI_TOKEN);
            
            expect(await uniToken.balanceOf(contract.address)).to.equal(ONE_UNI_TOKEN);
            expect(await uniToken.balanceOf(owner.address)).to.equal(balance.add(ONE_UNI_TOKEN));
            expect(await uniToken.balanceOf(user1.address)).to.equal(balanceUser1);

            await expect(contract.emergencyUnstake()).to.be.revertedWith("StakingPool: Insufficient staking balance");

            await contract.connect(user1).emergencyUnstake();
            expect(await contract.connect(user1).amountStaked(user1.address)).to.equal(0);

            expect(await uniToken.balanceOf(contract.address)).to.equal(0);
            expect(await uniToken.balanceOf(owner.address)).to.equal(balance.add(ONE_UNI_TOKEN));
            expect(await uniToken.balanceOf(user1.address)).to.equal(balanceUser1.add(ONE_UNI_TOKEN));

            await expect(contract.connect(user1).emergencyUnstake()).to.be.revertedWith("StakingPool: Insufficient staking balance");
        });
        it("Unstaked event should be emitted correctly", async () => {
            await uniToken.approve(contract.address, ONE_UNI_TOKEN);
            await contract.stake(ONE_UNI_TOKEN);
            await contract.declareEmergency();
            await expect(contract.emergencyUnstake())
                .to.emit(contract, "Unstaked")
                .withArgs(owner.address, ONE_UNI_TOKEN);
        });
        it("Owner is able to rescue tokens", async () => {
            expect(await uniToken.balanceOf(user1.address)).to.equal(0);
            await uniToken.approve(contract.address, ONE_UNI_TOKEN);
            await contract.stake(ONE_UNI_TOKEN);
            await uniToken.transfer(user2.address, ONE_UNI_TOKEN);
            await uniToken.connect(user2).approve(contract.address, ONE_UNI_TOKEN);
            await contract.connect(user2).stake(ONE_UNI_TOKEN);
            await contract.declareEmergency();
            await contract.emergencyRescue();
            expect(await uniToken.balanceOf(user1.address)).to.equal(ONE_UNI_TOKEN.mul(2));
        });
    });

    describe("stake()", () => {
        beforeEach(async () => {
            await contract.setToken(token.address);
            await contract.setUniToken(uniToken.address);
            await contract.setEcosystemPool(user1.address);
            await token.transfer(contract.address, INITIAL_BALANCE);
            await contract.beginStakingPeriod(ONE_YEAR);
        });
        describe("When the staking period has ended...", () => {
            it("Transaction should revert", async () => {
                await waitDays(366);
                await expect(contract.stake(ONE_UNI_TOKEN)).to.be.revertedWith("StakingPool: The staking period has ended");
            });
        });
        describe("When the staking period has not ended...", () => {
            describe("When the amount is > user's balance...", () => {
                it("Transaction should revert", async () => {
                    await expect(contract.connect(user1).stake(ONE_UNI_TOKEN)).to.be.reverted;
                });
            });
            describe("When the amount is zero...", () => {
                it("Transaction should revert", async () => {
                    await expect(contract.connect(user1).stake(0)).to.be.revertedWith("StakingPool: Amount must be greater than zero");
                });
            });
        });
    });

    describe("unstake()", () => {
        beforeEach(async () => {
            await contract.setToken(token.address);
            await contract.setUniToken(uniToken.address);
            await contract.setEcosystemPool(user1.address);
            await token.transfer(contract.address, INITIAL_BALANCE);
            await contract.beginStakingPeriod(ONE_YEAR);
        });
        describe("When the amount is > amount staked...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.unstake(ONE_UNI_TOKEN)).to.be.revertedWith("StakingPool: Amount is greater than staking balance");
            });
        });
        describe("When the amount is zero...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.unstake(0)).to.be.revertedWith("StakingPool: Amount must be greater than zero");
            });
        });
    });

    describe("Simulation Testing", () => {

        let amountStaked_user1;
        let amountStaked_user2;
        let amountStaked_user3;
        let secondsStaked_user1;
        let secondsStaked_user2;
        let secondsStaked_user3;
        let pointsEarned_user1;
        let pointsEarned_user2;
        let pointsEarned_user3;
        let numberOfStakes_user1;
        let numberOfStakes_user2;
        let numberOfStakes_user3;
        let secondsUnaccounted_user1;
        let secondsUnaccounted_user2;
        let secondsUnaccounted_user3;

        let globalAmountStaked;
        let globalSecondsStaked;
        let globalPointsEarned;
        let globalNumberOfStakes;
        let globalSecondsUnaccounted;

        let originalRewardBalance;
        let rewardsEarned_user1;
        let rewardsEarned_user2;
        let rewardsEarned_user3;

        let rewardsPerPoint;
        let rewardsAvailable;
        let rewardsUnlocked;
        let secondsElapsedInPeriod;

        let supplyDelta;

        let tokenBalance_user1;
        let tokenBalance_user2;
        let tokenBalance_user3;

        beforeEach(async () => {
            
            await contract.setToken(token.address);
            await contract.setUniToken(uniToken.address);
            await token.setRebaseController(owner.address);
            await token.transfer(contract.address, INITIAL_BALANCE);
            await uniToken.transfer(user1.address, ONE_UNI_TOKEN.mul(30));
            await uniToken.transfer(user2.address, ONE_UNI_TOKEN.mul(30));
            await uniToken.transfer(user3.address, ONE_UNI_TOKEN.mul(30));
            await contract.beginStakingPeriod(ONE_YEAR);

            //Headings
            console.log(
                "secondsElapsedInPeriod," +
                "amountStaked_user1," +
                "amountStaked_user2," +
                "amountStaked_user3," +
                "secondsStaked_user1," +
                "secondsStaked_user2," +
                "secondsStaked_user3," +
                "pointsEarned_user1," +
                "pointsEarned_user2," +
                "pointsEarned_user3," +
                "numberOfStakes_user1," +
                "numberOfStakes_user2," +
                "numberOfStakes_user3," +
                "secondsUnaccounted_user1," +
                "secondsUnaccounted_user2," +
                "secondsUnaccounted_user3," +
                "globalAmountStaked," +
                "globalSecondsStaked," +
                "globalPointsEarned," +
                "globalNumberOfStakes," +
                "globalSecondsUnaccounted," +
                "originalRewardBalance," +
                "rewardsEarned_user1," +
                "rewardsEarned_user2," +
                "rewardsEarned_user3," +
                "rewardsPerPoint," +
                "rewardsUnlocked," +
                "rewardsClaimed," +
                "rewardsAvailable," +
                "tokenBalance_user1," + 
                "tokenBalance_user2," + 
                "tokenBalance_user3" 
            );

            //Initial State
            await logState();

        });

        async function logState() {

            secondsElapsedInPeriod = await contract.secondsElapsedInPeriod();

            amountStaked_user1 = await contract.connect(user1).amountStaked(user1.address);
            amountStaked_user2 = await contract.connect(user2).amountStaked(user2.address);
            amountStaked_user3 = await contract.connect(user3).amountStaked(user3.address);

            secondsStaked_user1 = await contract.connect(user1).secondsStaked(user1.address);
            secondsStaked_user2 = await contract.connect(user2).secondsStaked(user2.address);
            secondsStaked_user3 = await contract.connect(user3).secondsStaked(user3.address);

            pointsEarned_user1 = await contract.connect(user1).pointsEarned(user1.address);
            pointsEarned_user2 = await contract.connect(user2).pointsEarned(user2.address);
            pointsEarned_user3 = await contract.connect(user3).pointsEarned(user3.address);

            numberOfStakes_user1 = await contract.connect(user1).numberOfStakes(user1.address);
            numberOfStakes_user2 = await contract.connect(user2).numberOfStakes(user2.address);
            numberOfStakes_user3 = await contract.connect(user3).numberOfStakes(user3.address);

            secondsUnaccounted_user1 = await contract.connect(user1).secondsUnaccounted(user1.address);
            secondsUnaccounted_user2 = await contract.connect(user2).secondsUnaccounted(user2.address);
            secondsUnaccounted_user3 = await contract.connect(user3).secondsUnaccounted(user3.address);

            globalAmountStaked = await contract.globalAmountStaked();
            globalSecondsStaked = await contract.globalSecondsStaked();
            globalPointsEarned = await contract.globalPointsEarned();
            globalNumberOfStakes = await contract.globalNumberOfStakes();
            globalSecondsUnaccounted = await contract.globalSecondsUnaccounted();

            originalRewardBalance = await contract.originalRewardBalance();
            rewardsEarned_user1 = await contract.connect(user1).rewardsEarned(user1.address);
            rewardsEarned_user2 = await contract.connect(user2).rewardsEarned(user2.address);
            rewardsEarned_user3 = await contract.connect(user3).rewardsEarned(user3.address);

            rewardsPerPoint = await contract.rewardsPerPoint();
            rewardsUnlocked = await contract.rewardsUnlocked();
            rewardsClaimed = await contract.rewardsClaimed();
            rewardsAvailable = await contract.rewardsAvailable();

            tokenBalance_user1 = await token.balanceOf(user1.address);
            tokenBalance_user2 = await token.balanceOf(user2.address);
            tokenBalance_user3 = await token.balanceOf(user3.address);

            console.log(
                secondsElapsedInPeriod + "," +
                amountStaked_user1 + "," +
                amountStaked_user2 + "," +
                amountStaked_user3 + "," +
                secondsStaked_user1 + "," +
                secondsStaked_user2 + "," +
                secondsStaked_user3 + "," +
                pointsEarned_user1 + "," +
                pointsEarned_user2 + "," +
                pointsEarned_user3 + "," +
                numberOfStakes_user1 + "," +
                numberOfStakes_user2 + "," +
                numberOfStakes_user3 + "," +
                secondsUnaccounted_user1 + "," +
                secondsUnaccounted_user2 + "," +
                secondsUnaccounted_user3 + "," +
                globalAmountStaked + "," +
                globalSecondsStaked + "," +
                globalPointsEarned + "," +
                globalNumberOfStakes + "," +
                globalSecondsUnaccounted + "," +
                originalRewardBalance + "," +
                rewardsEarned_user1 + "," +
                rewardsEarned_user2 + "," +
                rewardsEarned_user3 + "," +
                rewardsPerPoint + "," +
                rewardsUnlocked + "," +
                rewardsClaimed + "," +
                rewardsAvailable + "," +
                tokenBalance_user1 + "," +
                tokenBalance_user2 + "," +
                tokenBalance_user3
            );

        }

        async function stake(user, amount) {
            await uniToken.connect(user).approve(contract.address, amount);
            await contract.connect(user).stake(amount);
        }

        async function unstake(user, amount) {
            await contract.connect(user).unstake(amount);
        }

        // it("Comprehensive Testing, No Rebase", async () => {

        //     async function activity(user1, user2, user3, amount) {

        //         for (let i = 1; i <= 30; i++) {

        //             if (i % 3 == 0) {
        //                 await unstake(user1, amount);
        //             } else {
        //                 await stake(user1, amount);
        //             }

        //             if (i > 9) {
        //                 if (i % 3 == 0) {
        //                     await unstake(user2, amount);
        //                 } else {
        //                     await stake(user2, amount);
        //                 }    
        //             }

        //             if (i > 18) {
        //                 if (i % 3 == 0) {
        //                     await unstake(user3, amount);
        //                 } else {
        //                     await stake(user3, amount);
        //                 }    
        //             }

        //             if (i == 30) {
        //                 await unstake(user1, amount.mul(10));
        //                 await unstake(user2, amount.mul(7));
        //                 await unstake(user3, amount.mul(4));
        //             }

        //             await wait(86400);
        //             await logState();

        //         }

        //     }

        //     for (let i = 0; i < 4; i++) {
        //         await activity(user1, user2, user3, ONE_UNI_TOKEN);
        //         await activity(user3, user1, user2, ONE_UNI_TOKEN);
        //         await activity(user2, user3, user1, ONE_UNI_TOKEN);
        //     }

        //     secondsElapsedInPeriod = await contract.secondsElapsedInPeriod();

        //     let timeRemaining = ONE_YEAR.sub(secondsElapsedInPeriod);

        //     await increaseNextBlockTimestamp(timeRemaining.toNumber());
        //     await mine();

        //     secondsElapsedInPeriod = await contract.secondsElapsedInPeriod();
        //     console.log("seconds elapsed: " + secondsElapsedInPeriod);

        // }).timeout(600000);

        it("Extensive Simulation Testing, With Rebase", async () => {

            async function activity(user1, user2, user3, amount) {

                for (let i = 1; i <= 30; i++) {

                    if (i % 3 == 0) {
                        await unstake(user1, amount);
                    } else {
                        await stake(user1, amount);
                    }

                    if (i > 9) {
                        if (i % 3 == 0) {
                            await unstake(user2, amount);
                        } else {
                            await stake(user2, amount);
                        }    
                    }

                    if (i > 18) {
                        if (i % 3 == 0) {
                            await unstake(user3, amount);
                        } else {
                            await stake(user3, amount);
                        }    
                    }

                    if (i == 30) {
                        await unstake(user1, amount.mul(10));
                        await unstake(user2, amount.mul(7));
                        await unstake(user3, amount.mul(4));
                    }

                    supplyDelta = (await token.totalSupply()).div(100);
                    if (Math.random() < 0.5) supplyDelta = -supplyDelta;
                    await token.rebase(supplyDelta);

                    await wait(86400);
                    await logState();

                }

            }

            for (let i = 0; i < 3; i++) {
                await activity(user1, user2, user3, ONE_UNI_TOKEN);
                await activity(user3, user1, user2, ONE_UNI_TOKEN);
                await activity(user2, user3, user1, ONE_UNI_TOKEN);
            }

            await stake(user1, ONE_UNI_TOKEN.mul(10));
            await waitDays(30);
            await logState();

            await stake(user2, ONE_UNI_TOKEN.mul(20));
            await waitDays(30);
            await logState();

            await stake(user3, ONE_UNI_TOKEN.mul(30));

            secondsElapsedInPeriod = await contract.secondsElapsedInPeriod();
            let timeRemaining = ONE_YEAR.sub(secondsElapsedInPeriod);
            await increaseNextBlockTimestamp(timeRemaining.toNumber());
            await mine();

            await logState();

            await unstake(user1, ONE_UNI_TOKEN.mul(5));
            await waitDays(30);
            await logState();

            await unstake(user2, ONE_UNI_TOKEN.mul(10));
            await waitDays(30);
            await logState();

            await unstake(user3, ONE_UNI_TOKEN.mul(15));
            await logState();

            await waitDays(10);
            await logState();
            await waitDays(10);
            await logState();
            await waitDays(10);
            await logState();

            await unstake(user1, ONE_UNI_TOKEN.mul(5));
            await waitDays(30);
            await logState();

            await unstake(user2, ONE_UNI_TOKEN.mul(10));
            await waitDays(30);
            await logState();

            await unstake(user3, ONE_UNI_TOKEN.mul(15));

            await logState();

        }).timeout(600000);

    });

});