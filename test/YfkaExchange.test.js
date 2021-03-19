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

describe("YFKA EXCHANGE", () => {

    const DECIMALS = big(9);
    const INITIAL_BALANCE = big(1000000).mul(10**DECIMALS);
    const ONE_DAY = big(86400);
    const ONE_YEAR = ONE_DAY.mul(365);
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const ONE_ZPHR_TOKEN = big(1).mul(10**DECIMALS);
    const ONE_YFKA_TOKEN = big(1).mul(10**DECIMALS).mul(10**DECIMALS);
    const MAX_UINT256 = big("115792089237316195423570985008687907853269984665640564039457584007913129639935");

    let Contract;
    let contract;

    let ZPHR;
    let zphr;

    let YFKA;
    let yfka;

    let owner;
    let user1;
    let user2;
    let user3;
    let users;

    beforeEach(async () => {

        [owner, user1, user2, user3, ...users] = await ethers.getSigners();

        ZPHR = await ethers.getContractFactory("Zephyr");
        zphr = await ZPHR.deploy();

        YFKA = await ethers.getContractFactory("MockYFKA");
        yfka = await YFKA.deploy();

        Contract = await ethers.getContractFactory("YfkaExchange");
        contract = await Contract.deploy();

    });

    describe("setYfka()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._yfka()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setYfka(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._yfka()).to.equal(ZERO_ADDRESS);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The token should be set correctly", async () => {
                expect(await contract._yfka()).to.equal(ZERO_ADDRESS);
                await contract.setYfka(yfka.address);
                expect(await contract._yfka()).to.equal(yfka.address);
            });
        });
    });

    describe("setZphr()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._zphr()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setZphr(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._zphr()).to.equal(ZERO_ADDRESS);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The token should be set correctly", async () => {
                expect(await contract._zphr()).to.equal(ZERO_ADDRESS);
                await contract.setZphr(zphr.address);
                expect(await contract._zphr()).to.equal(zphr.address);
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

    describe("setYfkaExchangeLimit()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._yfkaExchangeLimit()).to.equal(big(100000).mul(10**9).mul(10**9));
                await expect(contract.connect(user1).setYfkaExchangeLimit(big(40000).mul(10**9).mul(10**9))).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._yfkaExchangeLimit()).to.equal(big(100000).mul(10**9).mul(10**9));
            });
        });
        describe("When the caller is the owner...", () => {
            it("The exchange limit should be set correctly", async () => {
                expect(await contract._yfkaExchangeLimit()).to.equal(big(100000).mul(10**9).mul(10**9));
                await contract.setYfkaExchangeLimit(big(40000).mul(10**9).mul(10**9));
                expect(await contract._yfkaExchangeLimit()).to.equal(big(40000).mul(10**9).mul(10**9));
            });
        });
    });

    describe("conclude()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.connect(user1).conclude()).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
        describe("When the zphr address has not been set...", () => {
            it("Transaction should revert", async () => {
                await expect(contract.conclude()).to.be.revertedWith("YfkaExchange: The ZPHR token has not been set");
            });
        });
        describe("When the ecosystem pool address has not been set...", () => {
            it("Transaction should revert", async () => {
                await contract.setZphr(zphr.address);
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await expect(contract.conclude()).to.be.revertedWith("YfkaExchange: The ecosystem pool address has not been set");
            });
        });
        describe("When the ecosystem pool address has been set...", () => {
            beforeEach(async () => {
                await contract.setZphr(zphr.address);
                await contract.setEcosystemPool(user1.address);
                await zphr.transfer(contract.address, INITIAL_BALANCE);
            });
            it("The remaining balance should transfer over to the ecosystem pool", async () => {
                const initialEcosystemBalance = await zphr.balanceOf(user1.address);
                const initialDistributionBalance = await zphr.balanceOf(contract.address);
                await contract.conclude();
                expect(await zphr.balanceOf(user1.address)).to.equal(initialEcosystemBalance.add(initialDistributionBalance));
                expect(await zphr.balanceOf(contract.address)).to.equal(initialDistributionBalance.sub(initialDistributionBalance));
            });
        });
    });

    describe("exchange", () => {

        describe("When the conditions for exchanging have not been met...", () => {
            it("Revert when yfka address isn't set", async () => {
                await expect(contract.exchange(ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: YFKA can't be the zero address");
            });
            it("Revert when zphr address isn't set", async () => {
                await contract.setYfka(yfka.address);
                await expect(contract.exchange(ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: ZPHR can't be the zero address");
            });
            it("Revert when current balance is zero", async () => {
                await contract.setZphr(zphr.address);
                await contract.setYfka(yfka.address);
                await expect(contract.exchange(ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: ZPHR balance must be greater than zero");
            });
            it("Revert when the exchange limit has been reached", async () => {
                await contract.setZphr(zphr.address);
                await contract.setYfka(yfka.address);

                await zphr.transfer(contract.address, ONE_ZPHR_TOKEN.mul(1000000));
                await yfka.approve(contract.address, ONE_YFKA_TOKEN.mul(100001));
                await contract.exchange(ONE_YFKA_TOKEN.mul(100000));

                await expect(contract.exchange(ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: ZPHR balance must be greater than zero");
            });
        });

        describe("When all the conditions for exchanging have been met...", () => {
            beforeEach(async () => {
                await zphr.transfer(contract.address, ONE_ZPHR_TOKEN.mul(1000000));
                await contract.setZphr(zphr.address);
                await contract.setYfka(yfka.address);
                await zphr.setRebaseController(owner.address);
            });
            it("The user should be able to redeem zphr tokens", async () => {

                let rate = await contract.exchangeRate();
                //console.log("Rate: " + rate);
                let userYfkaBalance = await yfka.balanceOf(owner.address);
                //console.log("Yfka: " + userYfkaBalance);
                let contractZphrBalance = await zphr.balanceOf(contract.address);
                //console.log("Zphr: " + contractZphrBalance);

                await yfka.approve(contract.address, ONE_YFKA_TOKEN);
                await contract.exchange(ONE_YFKA_TOKEN);

                expect(await yfka.balanceOf(owner.address)).to.equal(userYfkaBalance.sub(ONE_YFKA_TOKEN));
                expect(await zphr.balanceOf(contract.address)).to.equal(contractZphrBalance.sub(rate));

                //console.log("Yfka: " + (await yfka.balanceOf(owner.address)).toString());
                //console.log("Zphr: " + (await zphr.balanceOf(contract.address)).toString());

            });
            it("The Exchanged event should be emitted correctly", async () => {
                await yfka.approve(contract.address, ONE_YFKA_TOKEN);
                let rate = await contract.exchangeRate();
                let zphrAwarded = rate.mul(ONE_YFKA_TOKEN).div(10**DECIMALS).div(10**DECIMALS);
                await expect(contract.exchange(ONE_YFKA_TOKEN))
                    .to.emit(contract, "Exchanged")
                    .withArgs(owner.address, ONE_YFKA_TOKEN, zphrAwarded);
            });
            it("YFKA Exchanged, ZPHR Redeemed should return correctly", async () => {

                let rate = await contract.exchangeRate();
                let yfkaRedeemed = ONE_YFKA_TOKEN;
                let zphrAwarded = rate.mul(ONE_YFKA_TOKEN).div(10**DECIMALS).div(10**DECIMALS);

                expect(await contract.yfkaExchanged(owner.address)).to.equal(0);
                expect(await contract.zphrRedeemed(owner.address)).to.equal(0);

                await yfka.approve(contract.address, ONE_YFKA_TOKEN);
                await contract.exchange(ONE_YFKA_TOKEN);

                expect(await contract.yfkaExchanged(owner.address)).to.equal(yfkaRedeemed);
                expect(await contract.zphrRedeemed(owner.address)).to.equal(zphrAwarded);

                await yfka.approve(contract.address, ONE_YFKA_TOKEN);
                await contract.exchange(ONE_YFKA_TOKEN);

                expect(await contract.yfkaExchanged(owner.address)).to.equal(yfkaRedeemed.mul(2));
                expect(await contract.zphrRedeemed(owner.address)).to.equal(zphrAwarded.mul(2));

            });
            
            describe("Extensive simulation testing", () => {

                let yfkaExchanged;
                let exchangeRate;
                let currentBalance;
                
                let zphrBalance_user1;
                let zphrBalance_user2;
                let zphrBalance_user3;

                beforeEach(async () => {

                    await yfka.transfer(user1.address, ONE_YFKA_TOKEN.mul(70000));
                    await yfka.transfer(user2.address, ONE_YFKA_TOKEN.mul(70000));
                    await yfka.transfer(user3.address, ONE_YFKA_TOKEN.mul(70000));

                    //Headings
                    console.log(
                        "yfkaExchanged," +
                        "exchangeRate," + 
                        "currentBalance," + 
                        "zphrBalance_user1," +
                        "zphrBalance_user2," +
                        "zphrBalance_user3"
                    );

                    //Initial State
                    await logState();

                });

                async function logState() {

                    yfkaExchanged = await yfka.balanceOf(contract.address);
                    exchangeRate = await contract.exchangeRate();
                    currentBalance = await contract.currentBalance();

                    zphrBalance_user1 = await zphr.balanceOf(user1.address);
                    zphrBalance_user2 = await zphr.balanceOf(user2.address);
                    zphrBalance_user3 = await zphr.balanceOf(user3.address);

                    console.log(
                        yfkaExchanged + "," +
                        exchangeRate + "," +
                        currentBalance + "," +
                        zphrBalance_user1 + "," +
                        zphrBalance_user2 + "," +
                        zphrBalance_user3
                    );

                }

                // it("Comprehensive testing without rebases", async () => {

                //     async function exchange(user, amount) {
                //         await yfka.connect(user).approve(contract.address, amount);
                //         await contract.connect(user).exchange(amount);
                //         await logState();
                //     }

                //     await contract.setYfkaExchangeLimit(big(30000).mul(10**9).mul(10**9));

                //     for (let i = 0; i < 99; i++) {
                //         await exchange(user1, ONE_YFKA_TOKEN.mul(100));
                //         await exchange(user2, ONE_YFKA_TOKEN.mul(100));
                //         await exchange(user3, ONE_YFKA_TOKEN.mul(100));
                //     }

                //     await exchange(user1, ONE_YFKA_TOKEN.mul(150));
                //     await exchange(user1, ONE_YFKA_TOKEN.mul(300));

                //     await expect(exchange(user1, ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: ZPHR balance must be greater than zero");

                // }).timeout(600000);


                it("Comprehensive testing with rebases", async () => {

                    let supplyDelta;

                    await contract.setYfkaExchangeLimit(big(30000).mul(10**9).mul(10**9));

                    async function exchange(user, amount) {
                        await yfka.connect(user).approve(contract.address, amount);
                        await contract.connect(user).exchange(amount);
                        
                        await logState();

                        supplyDelta = (await zphr.totalSupply()).div(100);
                        if (Math.random() < 0.5) supplyDelta = -supplyDelta;
                        await zphr.rebase(supplyDelta);
                    }

                    for (let i = 0; i < 99; i++) {
                        await exchange(user1, ONE_YFKA_TOKEN.mul(100));
                        await exchange(user2, ONE_YFKA_TOKEN.mul(100));
                        await exchange(user3, ONE_YFKA_TOKEN.mul(100));
                    }

                    await exchange(user1, ONE_YFKA_TOKEN.mul(150));
                    await exchange(user1, ONE_YFKA_TOKEN.mul(300));

                    console.log("Current Balance: " + (await contract.currentBalance()).toString());

                    await expect(exchange(user1, ONE_YFKA_TOKEN)).to.be.revertedWith("YfkaExchange: The maximum amount of YFKA has been exchanged");

                }).timeout(600000);

            });

        });
        
    });

});