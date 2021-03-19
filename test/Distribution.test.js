const { expect } = require("chai");
const { ethers } = require("hardhat");

//Import the test proofs
let fs = require('fs');
let proofs = fs.readFileSync("scripts/hardhat-proofs.txt", "utf-8");
const PROOFS = JSON.parse(proofs);

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

describe("DISTRIBUTION", () => {

    const DECIMALS = big(9);
    const INITIAL_BALANCE = big(3000000).mul(10**DECIMALS);
    const ONE_DAY = big(86400);
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const ROOT_HASH = "0x192afe0d2350ed51588a9932ca8c3be491550b228b79df169181488baf26f0d8";
    const BYTES32_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

    let Token;
    let token; 

    let Contract;
    let contract;

    let owner;
    let user1;
    let user2;
    let users;

    beforeEach(async () => {

        Token = await ethers.getContractFactory("Zephyr");
        token = await Token.deploy();

        Contract = await ethers.getContractFactory("Distribution");
        contract = await Contract.deploy();

        [owner, user1, user2, ...users] = await ethers.getSigners();

    });

    describe("constructor()", () => {
        it("The owner should be set correctly", async () => {
            expect(await contract.owner()).to.equal(owner.address);
        });
    });

    describe("setToken()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._token()).to.equal(ZERO_ADDRESS);
                await expect(contract.connect(user1).setToken(token.address)).to.be.revertedWith("Ownable: caller is not the owner");
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

    describe("setRoot()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._root()).to.equal(BYTES32_ZERO);
                await expect(contract.connect(user1).setRoot(ROOT_HASH)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._root()).to.equal(BYTES32_ZERO);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The root hash should be set correctly", async () => {
                expect(await contract._root()).to.equal(BYTES32_ZERO);
                await contract.setRoot(ROOT_HASH);
                expect(await contract._root()).to.equal(ROOT_HASH);
            });
        });
    });

    describe("setClaimsAvailable()", () => {
        describe("When the caller is not the owner...", () => {
            it("Transaction should revert", async () => {
                expect(await contract._claimsAvailable()).to.equal(0);
                await expect(contract.connect(user1).setClaimsAvailable(1)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await contract._claimsAvailable()).to.equal(0);
            });
        });
        describe("When the caller is the owner...", () => {
            it("The claims available should be set correctly", async () => {
                expect(await contract._claimsAvailable()).to.equal(0);
                await contract.setClaimsAvailable(1);
                expect(await contract._claimsAvailable()).to.equal(1);
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
                await expect(contract.conclude()).to.be.revertedWith("Distribution: The token address has not been set");
            });
        });
        describe("When the ecosystem pool address has not been set...", () => {
            it("Transaction should revert", async () => {
                await contract.setToken(token.address);
                expect(await contract._ecosystem()).to.equal(ZERO_ADDRESS);
                await expect(contract.conclude()).to.be.revertedWith("Distribution: The ecosystem pool address has not been set");
            });
        });
        describe("When the ecosystem pool address has been set...", () => {
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

    describe("claim()", () => {
        describe("When the conditions for a claim have not been met...", () => {
            describe("When the token has not been set...", () => {
                it("Transaction should revert", async () => {
                    expect(await contract._token()).to.equal(ZERO_ADDRESS);
                    await expect(contract.claim(0, [])).to.be.revertedWith("Distribution: The token address has not been set");
                });
            });
            describe("When the root has not been set...", () => {
                it("Transaction should revert", async () => {
                    await contract.setToken(token.address);
                    expect(await contract._root()).to.equal(BYTES32_ZERO);
                    await expect(contract.claim(0, [])).to.be.revertedWith("Distribution: The root has not been set");
                });
            });
            describe("When the total claims available has not been set...", () => {
                it("Transaction should revert", async () => {
                    await contract.setToken(token.address);
                    await contract.setRoot(ROOT_HASH);
                    expect(await contract._claimsAvailable()).to.equal(0);
                    await expect(contract.claim(0, [])).to.be.revertedWith("Distribution: The number of available claims is zero");
                });
            });
            describe("When the contract owns no tokens...", () => {
                it("Transaction should revert", async () => {
                    await contract.setToken(token.address);
                    await contract.setRoot(ROOT_HASH);
                    await contract.setClaimsAvailable(1);
                    expect(await contract.currentBalance()).to.equal(0);
                    await expect(contract.claim(0, [])).to.be.revertedWith("Distribution: The token balance of the contract is zero");
                });
            });
        });
        describe("When the conditions for a claim have been met...", () => {
            beforeEach(async () => {
                await contract.setToken(token.address);
                await contract.setRoot(ROOT_HASH);
                await contract.setClaimsAvailable(20);
                await token.transfer(contract.address, INITIAL_BALANCE);
            });
            describe("When the distribution period is ongoing...", () => {
                describe("When the user has already claimed tokens...", () => {
                    it("Transaction should revert", async () => {
                        await contract.connect(user1).claim(1, PROOFS[1]);
                        await expect(contract.connect(user1).claim(1, PROOFS[1]))
                            .to.be.revertedWith("Distribution: Tokens have already been claimed by this address");
                    });
                });
                describe("When the user tries to claim with a different index number or proofs...", () => {
                    it("Transaction should revert", async () => {
                        await contract.connect(user1).claim(1, PROOFS[1]);
                        let balance = await token.balanceOf(user1.address);
                        await expect(contract.connect(user1).claim(1, PROOFS[2])).to.be.revertedWith("Distribution: Tokens have already been claimed by this address");
                        await expect(contract.connect(user1).claim(2, PROOFS[1])).to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                        await expect(contract.connect(user1).claim(2, PROOFS[2])).to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                        await expect(contract.connect(user1).claim(3, PROOFS[1])).to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                        await expect(contract.connect(user1).claim(3, PROOFS[2])).to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                        await expect(contract.connect(user1).claim(3, PROOFS[3])).to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                        expect(await token.balanceOf(user1.address)).to.equal(balance);
                    })
                });
                describe("When the supplied proofs fail to verify the address...", () => {
                    it("Transaction should revert", async () => {
                        await expect(contract.connect(user1).claim(1, PROOFS[2]))
                            .to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");
                    });
                });
                it("The claim should complete successfully and update balances", async () => {
                    const initialUserBalance = await token.balanceOf(user1.address);
                    const initialDistributionBalance = await token.balanceOf(contract.address);
                    const amount = initialDistributionBalance.div(20);

                    //Try hashing with ethers.js first
                    let hash = ethers.utils.solidityKeccak256(["address"],[user1.address]);
                    hash = ethers.utils.solidityKeccak256(["bytes32", "bytes32"],[PROOFS[1][0], hash]);
                    hash = ethers.utils.solidityKeccak256(["bytes32", "bytes32"],[hash, PROOFS[1][1]]);
                    hash = ethers.utils.solidityKeccak256(["bytes32", "bytes32"],[hash, PROOFS[1][2]]);
                    hash = ethers.utils.solidityKeccak256(["bytes32", "bytes32"],[hash, PROOFS[1][3]]);
                    hash = ethers.utils.solidityKeccak256(["bytes32", "bytes32"],[hash, PROOFS[1][4]]);
                    expect(hash).to.equal(ROOT_HASH);
                    
                    await contract.connect(user1).claim(1, PROOFS[1]);
                    expect(await token.balanceOf(user1.address)).to.equal(initialUserBalance.add(amount));
                    expect(await token.balanceOf(contract.address)).to.equal(initialDistributionBalance.sub(amount));
                });
                it("The claim should be marked correctly", async () => {
                    let claimed = await contract.claimed(1);
                    expect(claimed).to.be.false;
                    await contract.connect(user1).claim(1, PROOFS[1]);
                    claimed = await contract.claimed(1);
                    expect(claimed).to.be.true;
                });
                it("The Claim event should be emitted correctly", async () => {
                    let amount = (await token.balanceOf(contract.address)).div(20);
                    await expect(contract.connect(user1).claim(1, PROOFS[1]))
                        .to.emit(contract, "Claim")
                        .withArgs(1, user1.address, amount);
                });
                it("Extensive proof testing", async () => {

                    let amount;
                    let user = [owner, user1, user2, ...users];

                    for (let i = 0; i < user.length; i++) {

                        const initialUserBalance = await token.balanceOf(user[i].address);
                        const initialDistributionBalance = await token.balanceOf(contract.address);

                        amount = (await token.balanceOf(contract.address)).div(await contract._claimsAvailable());

                        let claimed = await contract.claimed(i);
                        expect(claimed).to.be.false;
                        
                        await contract.connect(user[i]).claim(i, PROOFS[i]);
                        expect(await token.balanceOf(user[i].address)).to.equal(initialUserBalance.add(amount));
                        expect(await token.balanceOf(contract.address)).to.equal(initialDistributionBalance.sub(amount));
                        // console.log("Amount: " + amount);

                        claimed = await contract.claimed(i);
                        expect(claimed).to.be.true;

                        if (i == user.length - 1) {
                            await expect(contract.connect(user[i]).claim(i, PROOFS[i]))
                                .to.be.revertedWith("Distribution: The number of available claims is zero");
                        } else {
                            await expect(contract.connect(user[i]).claim(i, PROOFS[i]))
                                .to.be.revertedWith("Distribution: Tokens have already been claimed by this address");
                        }

                    }

                });
                it("Extensive proof testing with rebases", async () => {

                    let amount;
                    let supplyDelta;
                    let user = [owner, user1, user2, ...users];

                    await token.setRebaseController(owner.address);

                    for (let i = 0; i < user.length; i++) {

                        const initialUserBalance = await token.balanceOf(user[i].address);
                        const initialDistributionBalance = await token.balanceOf(contract.address);

                        amount = (await token.balanceOf(contract.address)).div(await contract._claimsAvailable());

                        let claimed = await contract.claimed(i);
                        expect(claimed).to.be.false;
                        
                        await contract.connect(user[i]).claim(i, PROOFS[i]);
                        expect(await token.balanceOf(user[i].address)).to.equal(initialUserBalance.add(amount));
                        expect(await token.balanceOf(contract.address)).to.equal(initialDistributionBalance.sub(amount));
                        // console.log("Amount: " + amount);

                        claimed = await contract.claimed(i);
                        expect(claimed).to.be.true;

                        if (i == user.length - 1) {
                            await expect(contract.connect(user[i]).claim(i, PROOFS[i]))
                                .to.be.revertedWith("Distribution: The number of available claims is zero");
                        } else {
                            await expect(contract.connect(user[i]).claim(i, PROOFS[i]))
                                .to.be.revertedWith("Distribution: Tokens have already been claimed by this address");
                        }

                        supplyDelta = (await token.totalSupply()).div(100);
                        if (Math.random() < 0.5) supplyDelta = -supplyDelta;
                        await token.rebase(supplyDelta);

                    }

                });
                it("Testing other addresses", async () => {

                    for (let i = 0; i < 20; i++) {
                        
                        let user = ethers.Wallet.createRandom().connect(ethers.provider);
                        owner.sendTransaction({to:user.address, value:ethers.utils.parseEther("1.0")});

                        const initialUserBalance = await token.balanceOf(user.address);
                        const initialDistributionBalance = await token.balanceOf(contract.address);
                        
                        await expect(contract.connect(user).claim(i, PROOFS[i]))
                            .to.be.revertedWith("Distribution: The proofs supplied were unable to validate this address");

                        expect(await token.balanceOf(user.address)).to.equal(initialUserBalance);
                        expect(await token.balanceOf(contract.address)).to.equal(initialDistributionBalance);

                    }

                });
            });

            describe("claimed()", () => {
                it("User's claim status should be returned correctly", async () => {
                    let user = [owner, user1, user2, ...users];
                    for (let i = 0; i < 20; i++) {
                        let claimed = await contract.claimed(i);
                        expect(claimed).to.be.false;
                        await contract.connect(user[i]).claim(i, PROOFS[i]);
                        claimed = await contract.claimed(i);
                        expect(claimed).to.be.true;
                    }
                });
            });

        });

    });

});