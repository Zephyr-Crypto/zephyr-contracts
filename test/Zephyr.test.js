const { expect } = require("chai");
const { ethers } = require("hardhat");

return;

function big(number) {
    return ethers.BigNumber.from(number);
}

describe("ZEPHYR", () => {

    const TOKEN_NAME = "Zephyr";
    const TOKEN_SYMBOL = "ZPHR";
    const DECIMALS = big(9);
    const TOTAL_SUPPLY = big(21000000).mul(10**DECIMALS);
    // const TRANSFER_AMOUNT = big(100).mul(10**DECIMALS);
    const TRANSFER_AMOUNT = big("187324091823");
    const TRANSFER_DEV_FEE = TRANSFER_AMOUNT.div(1000);
    const TRANSFER_REMAINDER = TRANSFER_AMOUNT.sub(TRANSFER_DEV_FEE);
    const TRANSFER_AMOUNT_PLUS_ONE = TRANSFER_AMOUNT.add(1);
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const MAX_UINT128 = big("340282366920938463463374607431768211455");
    const MAX_UINT256 = big("115792089237316195423570985008687907853269984665640564039457584007913129639935");
    const TOTAL_GONS = big("115792089237316195423570985008687907853269984665640564039457576000000000000000");

    let factory;
    let token;
    let owner;
    let user1;
    let user2;
    let user3;
    let users;

    beforeEach(async () => {

        [owner, user1, user2, user3, ...users] = await ethers.getSigners();

        factory = await ethers.getContractFactory("Zephyr");
        token = await factory.deploy();
        
    });

    describe("DEPLOYMENT", () => {

        it("Should set the correct owner", async () => {
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should set the correct token name", async () => {
            expect(await token.name()).to.equal(TOKEN_NAME);
        });

        it("Should set the correct token symbol", async () => {
            expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("Should have 9 decimal places", async () => {
            expect(await token.decimals()).to.equal(DECIMALS);
        });

        it("Should set total supply to 21,000,000 tokens", async () => {
            expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
        });

        it("Should assign the total supply to the owner", async () => {
            expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
        });

        it("Should return 0 if the user has no tokens", async () => {
            expect(await token.balanceOf(user1.address)).to.equal(0);
        });

        it("Should set the owner as the rebase controller", async () => {
            expect(await token._rebaseController()).to.equal(owner.address);
        });
        
    });

    describe("ERC20 FUNCTIONS", () => {

        describe("TOTAL SUPPLY", () => {

            describe("When the user calls totalSupply()...", () => {
                it("The current fragment supply should be returned", async () => {
                    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY)
                });
            });

        });

        describe("TRANSFER", () => {
            
            beforeEach(async () => {
                await token.setDeveloper(user2.address);
            });

            describe("When the sender does not have enough balance...", () => {

                describe("When dev fee is not enabled...", () => {
                    it("Transaction should revert and all balances should stay the same", async () => {                    
                        const initialSenderBalance = await token.balanceOf(user1.address);
                        const initialReceiverBalance = await token.balanceOf(owner.address);
                        const initialDeveloperBalance = await token.balanceOf(user2.address);
    
                        await expect(token.connect(user1).transfer(owner.address, TRANSFER_AMOUNT)).to.be.reverted;
    
                        expect(await token.balanceOf(user1.address)).to.equal(initialSenderBalance);
                        expect(await token.balanceOf(owner.address)).to.equal(initialReceiverBalance);
                        expect(await token.balanceOf(user2.address)).to.equal(initialDeveloperBalance);
                    });
                });

                describe("When dev fee is enabled...", () => {
                    it("Transaction should revert and all balances should stay the same", async () => {
                        await token.setDevFeeEnabled(true);

                        const initialSenderBalance = await token.balanceOf(user1.address);
                        const initialReceiverBalance = await token.balanceOf(owner.address);
                        const initialDeveloperBalance = await token.balanceOf(user2.address);
    
                        await expect(token.connect(user1).transfer(owner.address, TRANSFER_AMOUNT)).to.be.reverted;
    
                        expect(await token.balanceOf(user1.address)).to.equal(initialSenderBalance);
                        expect(await token.balanceOf(owner.address)).to.equal(initialReceiverBalance);
                        expect(await token.balanceOf(user2.address)).to.equal(initialDeveloperBalance);
                    });
                });

            });

            describe("When the sender does have enough balance...", () => {

                describe("When dev fee is not enabled...", () => {

                    it("Balances for sender and receiver should update correctly", async () => {

                        const initialSenderBalance = await token.balanceOf(owner.address);
                        const initialReceiverBalance = await token.balanceOf(user1.address);
                        const initialDeveloperBalance = await token.balanceOf(user2.address);

                        await token.transfer(user1.address, TRANSFER_AMOUNT);

                        expect(await token.balanceOf(owner.address)).to.equal(initialSenderBalance.sub(TRANSFER_AMOUNT));
                        expect(await token.balanceOf(user1.address)).to.equal(initialReceiverBalance.add(TRANSFER_AMOUNT));
                        expect(await token.balanceOf(user2.address)).to.equal(initialDeveloperBalance);

                        // console.log("Sender balance: " + (await token.balanceOf(owner.address)).toString());
                        // console.log("Receiver balance: " + (await token.balanceOf(user1.address)).toString());

                    });

                    it("Transfer event should be emitted on successful transfer", async () => {
                        await expect(token.transfer(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Transfer")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT);
                    });

                    it("Transfers to the zero address should revert", async () => {
                        await expect(token.transfer(ZERO_ADDRESS, TRANSFER_AMOUNT)).to.be.reverted;
                    });
                    
                    it("Transfers to the contract address should revert", async () => {
                        await expect(token.transfer(token.address, TRANSFER_AMOUNT)).to.be.reverted;
                    });

                });

                describe("When dev fee is enabled...", () => {

                    beforeEach(async () => {
                        await token.setDevFeeEnabled(true);
                    });

                    it("Balances for sender, receiver, and dev should update correctly", async () => {
    
                        const initialSenderBalance = await token.balanceOf(owner.address);
                        const initialReceiverBalance = await token.balanceOf(user1.address);
                        const initialDeveloperBalance = await token.balanceOf(user2.address);
    
                        await token.transfer(user1.address, TRANSFER_AMOUNT);
    
                        const endingSenderBalance = initialSenderBalance.sub(TRANSFER_AMOUNT);
                        const endingReceiverBalance = initialReceiverBalance.add(TRANSFER_REMAINDER);
                        const endingDeveloperBalance = initialDeveloperBalance.add(TRANSFER_DEV_FEE);
    
                        expect(await token.balanceOf(owner.address)).to.equal(endingSenderBalance);
                        expect(await token.balanceOf(user1.address)).to.equal(endingReceiverBalance);
                        expect(await token.balanceOf(user2.address)).to.equal(endingDeveloperBalance);
    
                    });
    
                    it("Transfer event should be emitted on successful transfer", async () => {
                        await expect(token.transfer(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Transfer")
                            .withArgs(owner.address, user1.address, TRANSFER_REMAINDER);
                    });
    
                    it("Dev fee event should be emitted on successful transfer", async () => {
                        await expect(token.transfer(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "DevFee")
                            .withArgs(owner.address, user2.address, TRANSFER_DEV_FEE);
                    });
    
                    it("Transfers to the zero address should revert", async () => {
                        await expect(token.transfer(ZERO_ADDRESS, TRANSFER_AMOUNT)).to.be.reverted;
                    });
                    
                    it("Transfers to the contract address should revert", async () => {
                        await expect(token.transfer(token.address, TRANSFER_AMOUNT)).to.be.reverted;
                    });
    
                    /*
                    Relies on access to the private variables _gonsPerFragment and _gonBalances to verify calculations.
                    */
                    it("Multiple transfers", async () => {
    
                        let transferAmount = TRANSFER_AMOUNT;
                        let gonsPerFragment;
    
                        for (let i = 0; i < 30; i++) {
    
                            transferAmount = transferAmount.add(77777777777)
                            gonsPerFragment = await token._gonsPerFragment();
    
                            const initialSenderFragments = await token.balanceOf(owner.address);
                            const initialReceiverFragments = await token.balanceOf(user1.address);
                            const initialDeveloperFragments = await token.balanceOf(user2.address);

                            const initialSenderGons = await token._gonBalances(owner.address);
                            const initialReceiverGons = await token._gonBalances(user1.address);
                            const initialDeveloperGons = await token._gonBalances(user2.address);
    
                            await token.transfer(user1.address, transferAmount);
    
                            const developerFragments = transferAmount.div(1000);
                            const receiverFragments = transferAmount.sub(developerFragments);
    
                            const endingSenderFragments = await token.balanceOf(owner.address);
                            const endingReceiverFragments = await token.balanceOf(user1.address);
                            const endingDeveloperFragments = await token.balanceOf(user2.address);
        
                            const endingSenderGons = await token._gonBalances(owner.address);
                            const endingReceiverGons = await token._gonBalances(user1.address);
                            const endingDeveloperGons = await token._gonBalances(user2.address);
    
                            expect(endingSenderFragments).to.equal(initialSenderFragments.sub(transferAmount));
                            expect(endingReceiverFragments).to.equal(initialReceiverFragments.add(receiverFragments));
                            expect(endingDeveloperFragments).to.equal(initialDeveloperFragments.add(developerFragments));
                            expect(initialSenderFragments.sub(endingSenderFragments)).to.equal(receiverFragments.add(developerFragments));
                            
                            expect(endingSenderGons).to.equal(initialSenderGons.sub(transferAmount.mul(gonsPerFragment)));
                            expect(endingReceiverGons).to.equal(initialReceiverGons.add(receiverFragments.mul(gonsPerFragment)));
                            expect(endingDeveloperGons).to.equal(initialDeveloperGons.add(developerFragments.mul(gonsPerFragment)));
                            expect(initialSenderGons.sub(endingSenderGons)).to.equal(
                                receiverFragments.mul(gonsPerFragment).add(developerFragments.mul(gonsPerFragment)
                            ));
    
                        }
    
                    });

                });

            });
        
        });

        describe("TRANSFER FROM", () => {

            beforeEach(async () => {
                await token.setDeveloper(user3.address);
            });

            describe("When the spender does not have enough approved balance...", () => {

                describe("When dev fee is not enabled...", () => {
                    it("Transaction should revert and all balances should stay the same", async () => {                    
                        const initialOwnerBalance = await token.balanceOf(owner.address);
                        const initialReceiverBalance = await token.balanceOf(user2.address);
                        const initialDeveloperBalance = await token.balanceOf(user3.address);

                        await token.approve(user1.address, TRANSFER_AMOUNT);

                        await expect(token.connect(user1).transferFrom(
                            owner.address, user2.address, TRANSFER_AMOUNT_PLUS_ONE
                        )).to.be.reverted;

                        expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
                        expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance);
                        expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
                    });
                });

                describe("When dev fee is enabled...", () => {
                    it("Transaction should revert and all balances should stay the same", async () => {
                        await token.setDevFeeEnabled(true);

                        const initialOwnerBalance = await token.balanceOf(owner.address);
                        const initialReceiverBalance = await token.balanceOf(user2.address);
                        const initialDeveloperBalance = await token.balanceOf(user3.address);

                        await token.approve(user1.address, TRANSFER_AMOUNT);

                        await expect(token.connect(user1).transferFrom(
                            owner.address, user2.address, TRANSFER_AMOUNT_PLUS_ONE
                        )).to.be.reverted;

                        expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
                        expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance);
                        expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
                    });
                });

            });

            describe("When the spender does have enough approved balance...", () => {

                describe("When the owner does not have enough balance...", () => {

                    describe("When dev fee is not enabled...", () => {
                        it("Transaction should revert and all balances should stay the same", async () => {
    
                            const initialOwnerBalance = await token.balanceOf(user1.address);
                            const initialReceiverBalance = await token.balanceOf(user2.address);
                            const initialDeveloperBalance = await token.balanceOf(user3.address);
    
                            await token.connect(user1).approve(owner.address, TRANSFER_AMOUNT);
    
                            await expect(token.transferFrom(user1.address, user2.address, TRANSFER_AMOUNT)).to.be.reverted;
    
                            expect(await token.balanceOf(user1.address)).to.equal(initialOwnerBalance);
                            expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance);
                            expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance);
                            expect(await token.allowance(user1.address, owner.address)).to.equal(TRANSFER_AMOUNT);
    
                        });
                    });

                    describe("When dev fee is enabled...", () => {
                        it("Transaction should revert and all balances should stay the same", async () => {

                            await token.setDevFeeEnabled(true);
    
                            const initialOwnerBalance = await token.balanceOf(user1.address);
                            const initialReceiverBalance = await token.balanceOf(user2.address);
                            const initialDeveloperBalance = await token.balanceOf(user3.address);
    
                            await token.connect(user1).approve(owner.address, TRANSFER_AMOUNT);
    
                            await expect(token.transferFrom(user1.address, user2.address, TRANSFER_AMOUNT)).to.be.reverted;
    
                            expect(await token.balanceOf(user1.address)).to.equal(initialOwnerBalance);
                            expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance);
                            expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance);
                            expect(await token.allowance(user1.address, owner.address)).to.equal(TRANSFER_AMOUNT);

                        });
                    });

                });

                describe("When the owner does have enough balance...", () => {

                    let initialOwnerBalance;
                    let initialReceiverBalance;
                    let initialDeveloperBalance;
                    let allowance;

                    beforeEach(async () => {

                        await token.approve(user1.address, TRANSFER_AMOUNT);

                        initialOwnerBalance = await token.balanceOf(owner.address);
                        initialReceiverBalance = await token.balanceOf(user2.address);
                        initialDeveloperBalance = await token.balanceOf(user3.address);
                        allowance = await token.allowance(owner.address, user1.address);

                    });

                    describe("When dev fee is not enabled...", () => {

                        it("Spender allowance should decrease correctly", async () => {
                            await token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
                            expect(await token.allowance(owner.address, user1.address)).to.equal(allowance.sub(TRANSFER_AMOUNT));
                        });
    
                        it("Balances for owner and receiver should update correctly", async () => {
                            await token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
                            expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance.sub(TRANSFER_AMOUNT));
                            expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance.add(TRANSFER_AMOUNT));
                            expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance);
                        });

                        it("Transfer event should be emitted on successful transfer", async () => {
                            await expect(token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT))
                                .to.emit(token, "Transfer")
                                .withArgs(owner.address, user2.address, TRANSFER_AMOUNT);
                        });

                    });

                    describe("When dev fee is enabled...", () => {

                        beforeEach(async () => {
                            await token.setDevFeeEnabled(true);
                        });

                        it("Spender allowance should decrease correctly", async () => {
                            await token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
                            expect(await token.allowance(owner.address, user1.address)).to.equal(allowance.sub(TRANSFER_AMOUNT));
                        });
    
                        it("Balances for owner, receiver, and developer should update correctly", async () => {
                            await token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
                            expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance.sub(TRANSFER_AMOUNT));
                            expect(await token.balanceOf(user2.address)).to.equal(initialReceiverBalance.add(TRANSFER_REMAINDER));
                            expect(await token.balanceOf(user3.address)).to.equal(initialDeveloperBalance.add(TRANSFER_DEV_FEE));
                        });
    
                        it("Transfer event should be emitted on successful transfer", async () => {
                            await expect(token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT))
                                .to.emit(token, "Transfer")
                                .withArgs(owner.address, user2.address, TRANSFER_REMAINDER);
                        });
    
                        it("Dev fee event should be emitted on successful transfer", async () => {
                            await expect(token.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT))
                                .to.emit(token, "DevFee")
                                .withArgs(owner.address, user3.address, TRANSFER_DEV_FEE);
                        });
    
                        /*
                        Relies on access to the private variables _gonsPerFragment and _gonBalances to verify calculations.
                        */
                        it("Multiple transferFroms", async () => {
    
                            let transferAmount = TRANSFER_AMOUNT;
                            let gonsPerFragment;
    
                            for (let i = 0; i < 30; i++) {
    
                                transferAmount = transferAmount.add(77777777777)
                                gonsPerFragment = await token._gonsPerFragment();
    
                                await token.approve(user1.address, transferAmount);
    
                                const initialSenderFragments = await token.balanceOf(owner.address);
                                const initialReceiverFragments = await token.balanceOf(user2.address);
                                const initialDeveloperFragments = await token.balanceOf(user3.address);
    
                                const initialSenderGons = await token._gonBalances(owner.address);
                                const initialReceiverGons = await token._gonBalances(user2.address);
                                const initialDeveloperGons = await token._gonBalances(user3.address);
    
                                await token.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
    
                                const developerFragments = transferAmount.div(1000);
                                const receiverFragments = transferAmount.sub(developerFragments);
        
                                const endingSenderFragments = await token.balanceOf(owner.address);
                                const endingReceiverFragments = await token.balanceOf(user2.address);
                                const endingDeveloperFragments = await token.balanceOf(user3.address);
            
                                const endingSenderGons = await token._gonBalances(owner.address);
                                const endingReceiverGons = await token._gonBalances(user2.address);
                                const endingDeveloperGons = await token._gonBalances(user3.address);
    
                                expect(endingSenderFragments).to.equal(initialSenderFragments.sub(transferAmount));
                                expect(endingReceiverFragments).to.equal(initialReceiverFragments.add(receiverFragments));
                                expect(endingDeveloperFragments).to.equal(initialDeveloperFragments.add(developerFragments));
                                expect(initialSenderFragments.sub(endingSenderFragments)).to.equal(receiverFragments.add(developerFragments));
                                
                                expect(endingSenderGons).to.equal(initialSenderGons.sub(transferAmount.mul(gonsPerFragment)));
                                expect(endingReceiverGons).to.equal(initialReceiverGons.add(receiverFragments.mul(gonsPerFragment)));
                                expect(endingDeveloperGons).to.equal(initialDeveloperGons.add(developerFragments.mul(gonsPerFragment)));
                                expect(initialSenderGons.sub(endingSenderGons)).to.equal(
                                    receiverFragments.mul(gonsPerFragment).add(developerFragments.mul(gonsPerFragment)
                                ));
    
                            }
    
                        });

                    });

                });

            });

        });

        describe("APPROVE", () => {

            describe("When the owner does not have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should set correctly", async () => {
                        await token.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT);
                    });

                    it("Approval event should be emitted on successful approval", async () => {
                        await expect(token.connect(user1).approve(user2.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, TRANSFER_AMOUNT);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should set correctly", async () => {
                        await token.connect(user1).approve(user2.address, TRANSFER_AMOUNT_PLUS_ONE);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT_PLUS_ONE);
                    });

                    it("Approval event should be emitted on successful approval", async () => {
                        await expect(token.connect(user1).approve(user2.address, TRANSFER_AMOUNT_PLUS_ONE))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, TRANSFER_AMOUNT_PLUS_ONE);
                    });

                });

            });

            describe("When the owner does have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should set correctly", async () => {
                        await token.approve(user1.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
                    });

                    it("Approval event should be emitted on successful approval", async () => {
                        await expect(token.approve(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.approve(user1.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should set correctly", async () => {
                        await token.approve(user1.address, TRANSFER_AMOUNT_PLUS_ONE);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT_PLUS_ONE);
                    });

                    it("Approval event should be emitted on successful approval", async () => {
                        await expect(token.approve(user1.address, TRANSFER_AMOUNT_PLUS_ONE))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT_PLUS_ONE);
                    });

                });

            });

        });

        describe("ALLOWANCE", () => {

            describe("When the spender does not have a current allowance...", () => {

                it("Allowance should return zero", async () => {
                    expect(await token.allowance(owner.address, user1.address)).to.equal(0);
                });

            });

            describe("When the spender does have a current allowance...", () => {

                it("Allowance should return the correct allowance", async () => {
                    await token.approve(user1.address, TRANSFER_AMOUNT);
                    expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
                });

            });

        });

        describe("INCREASE ALLOWANCE", () => {

            describe("When the owner does not have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should increase correctly", async () => {
                        await token.connect(user1).increaseAllowance(user2.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT);
                    });

                    it("Approval event should be emitted on successful allowance increase", async () => {
                        await expect(token.connect(user1).increaseAllowance(user2.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, TRANSFER_AMOUNT);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should increase correctly", async () => {
                        await token.connect(user1).increaseAllowance(user2.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT.add(TRANSFER_AMOUNT));
                    });

                    it("Approval event should be emitted on successful allowance increase", async () => {
                        await expect(token.connect(user1).increaseAllowance(user2.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, TRANSFER_AMOUNT.add(TRANSFER_AMOUNT));
                    });

                });

            });

            describe("When the owner does have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should increase correctly", async () => {
                        await token.increaseAllowance(user1.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
                    });

                    it("Approval event should be emitted on successful allowance increase", async () => {
                        await expect(token.increaseAllowance(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.approve(user1.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should increase correctly", async () => {
                        await token.increaseAllowance(user1.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT.add(TRANSFER_AMOUNT));
                    });

                    it("Approval event should be emitted on successful allowance increase", async () => {
                        await expect(token.increaseAllowance(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT.add(TRANSFER_AMOUNT));
                    });

                });

            });

        });

        describe("DECREASE ALLOWANCE", () => {

            describe("When the owner does not have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should remain zero", async () => {
                        await token.connect(user1).decreaseAllowance(user2.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(0);
                    });

                    it("Approval event should be emitted, allowance remains zero", async () => {
                        await expect(token.connect(user1).decreaseAllowance(user2.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, 0);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.connect(user1).approve(user2.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should decrease correctly", async () => {
                        await token.connect(user1).decreaseAllowance(user2.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(user1.address, user2.address)).to.equal(TRANSFER_AMOUNT.sub(TRANSFER_AMOUNT));
                    });

                    it("Approval event should be emitted on successful allowance decrease", async () => {
                        await expect(token.connect(user1).decreaseAllowance(user2.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(user1.address, user2.address, TRANSFER_AMOUNT.sub(TRANSFER_AMOUNT));
                    });

                });

            });

            describe("When the owner does have enough balance...", () => {

                describe("When the spender does not have a current allowance...", () => {

                    it("Spender allowance should remain zero", async () => {
                        await token.decreaseAllowance(user1.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(0);
                    });

                    it("Approval event should be emitted, allowance remains zero", async () => {
                        await expect(token.decreaseAllowance(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, 0);
                    });

                });

                describe("When the spender does have a current allowance...", () => {

                    beforeEach(async () => {
                        await token.approve(user1.address, TRANSFER_AMOUNT);
                    })

                    it("Spender allowance should decrease correctly", async () => {
                        await token.decreaseAllowance(user1.address, TRANSFER_AMOUNT);
                        expect(await token.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT.sub(TRANSFER_AMOUNT));
                    });

                    it("Approval event should be emitted on successful allowance decrease", async () => {
                        await expect(token.decreaseAllowance(user1.address, TRANSFER_AMOUNT))
                            .to.emit(token, "Approval")
                            .withArgs(owner.address, user1.address, TRANSFER_AMOUNT.sub(TRANSFER_AMOUNT));
                    });

                });

            });

        });

    });

    describe("DEV FEE FUNCTIONS", () => {

        describe("SET DEVELOPER", () => {

            describe("When called by a user other than the contract owner...", () => {
                it("Transaction should revert and developer address should remain unchanged", async () => {
                    const developer = await token._developer();
                    expect(developer).to.equal(owner.address);
                    await expect(token.connect(user1).setDeveloper(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                    expect(await token._developer()).to.equal(developer);
                });
            });

            describe("When called by the contract owner...", () => {
                it("Developer address should be set correctly", async () => {
                    expect(await token._developer()).to.equal(owner.address);
                    await token.setDeveloper(user1.address);
                    expect(await token._developer()).to.equal(user1.address);
                });
            });

        });

        describe("SET DEV FEE ENABLED", () => {

            describe("When called by a user other than the contract owner...", () => {
                it("Transaction should revert and dev fee status should remain unchanged", async () => {
                    const enabled = await token._devFeeEnabled();
                    expect(enabled).to.equal(false);
                    await expect(token.connect(user1).setDevFeeEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
                    expect(await token._devFeeEnabled()).to.equal(enabled);
                });
            });

            describe("When called by the contract owner...", () => {
                it("Dev fee status should be set correctly", async () => {
                    expect(await token._devFeeEnabled()).to.equal(false);
                    await token.setDevFeeEnabled(true);
                    expect(await token._devFeeEnabled()).to.equal(true);
                });
            });

        });

    });

    describe("REBASE FUNCTIONS", () => {

        describe("SET REBASE CONTROLLER", () => {

            describe("When called by a user other than the contract owner...", () => {

                it("Transaction should revert and rebase controller address should remain unchanged", async () => {
                    const controller = await token._rebaseController();
                    await expect(token.connect(user1).setRebaseController(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
                    expect(await token._rebaseController()).to.equal(controller);
                });

            });

            describe("When called by the contract owner...", () => {

                it("Rebase controller contract should be set correctly", async () => {
                    await token.setRebaseController(user1.address);
                    expect(await token._rebaseController()).to.equal(user1.address);
                });

            });

        });

        describe("REBASE", () => {

            let epoch;
            let supplyDelta;

            beforeEach(() => {
                epoch = 0;
            });

            describe("When called by a user other than the controller...", () => {

                it("Transaction should revert and no rebase should occur", async () => {
                    const totalSupply = await token.totalSupply();
                    await expect(token.connect(user1).rebase(1000)).to.be.revertedWith("Zephyr: Function can only be called by the Rebase Controller");
                    expect(await token.totalSupply()).to.equal(totalSupply);
                })

            });

            describe("When called by the controller...", () => {

                let totalSupply;

                beforeEach(async () => {
                    await token.setRebaseController(owner.address);
                    totalSupply = await token.totalSupply();
                });

                describe("When supply delta is zero...", () => {

                    it("Total supply should remain unchanged", async () => {
                        await token.rebase(0);
                        expect(await token.totalSupply()).to.equal(totalSupply);
                    });

                    it("Rebase event should be emitted on successful rebase", async () => {
                        await expect(token.rebase(0))
                            .to.emit(token, "Rebase")
                            .withArgs(epoch + 1, totalSupply);
                    });

                    it("Epoch should increase by 1", async () => {
                        await token.rebase(0);
                        expect(await token._epoch()).to.equal(epoch + 1);
                    });

                });

                describe("When supply delta is positive: 210000 tokens (1%)...", () => {

                    let newTotalSupply;

                    beforeEach(async () => {
                        supplyDelta = big(210000).mul(10**DECIMALS);
                        newTotalSupply = totalSupply.add(supplyDelta);
                    });
                    
                    it("Total supply should increase by supply delta", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token.totalSupply()).to.equal(newTotalSupply);
                    });

                    it("Rebase event should be emitted on successful rebase", async () => {                        
                        await expect(token.rebase(supplyDelta))
                            .to.emit(token, "Rebase")
                            .withArgs(epoch + 1, newTotalSupply);
                    });

                    it("Epoch should increase by 1", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(epoch + 1);
                    });

                    it("User balances should increase by the appropriate percentage", async () => {
                        
                        await token.transfer(user1.address, big("222222222222223"));
                        await token.transfer(user2.address, big("777777777777777"));
                    
                        await token.rebase(supplyDelta);

                        expect(await token.balanceOf(owner.address)).to.equal(big("20200000000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("224444444444445"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("785555555555554"));

                    });

                });

                describe("When supply delta is negative: -210000 tokens (-1%)...", () => {
                    
                    beforeEach(async () => {
                        supplyDelta = big(210000).mul(10**DECIMALS).mul(-1);
                        newTotalSupply = totalSupply.sub(supplyDelta.abs());
                    });

                    it("Total supply should decrease by supply delta", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token.totalSupply()).to.equal(newTotalSupply);
                    });

                    it("Rebase event should be emitted on successful rebase", async () => {
                        await expect(token.rebase(supplyDelta))
                            .to.emit(token, "Rebase")
                            .withArgs(epoch + 1, newTotalSupply);
                    });

                    it("Epoch should increase by 1", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(epoch + 1);
                    });

                    it("User balances should decrease by the appropriate percentage", async () => {

                        await token.transfer(user1.address, big("222222222222223"));
                        await token.transfer(user2.address, big("777777777777777"));

                        await token.rebase(supplyDelta);

                        expect(await token.balanceOf(owner.address)).to.equal(big("19800000000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("220000000000000"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("769999999999999"));

                    });

                });

                describe("Rebase test with custom supplyDelta: 27500 tokens (2.7555%)...", () => {

                    beforeEach(() => {
                        supplyDelta = big(578655).mul(10**DECIMALS);
                        newTotalSupply = totalSupply.add(supplyDelta);
                    });

                    it("Total supply should increase by supply delta", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token.totalSupply()).to.equal(newTotalSupply);
                    });

                    it("Rebase event should be emitted on successful rebase", async () => {
                        await expect(token.rebase(supplyDelta))
                            .to.emit(token, "Rebase")
                            .withArgs(epoch + 1, newTotalSupply);
                    });

                    it("Epoch should increase by 1", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(epoch + 1);
                    });

                    it("User balances should increase by the appropriate percentage", async () => {
                        
                        await token.transfer(user1.address, big("222222222222223"));
                        await token.transfer(user2.address, big("777777777777777"));

                        await token.rebase(supplyDelta);

                        expect(await token.balanceOf(owner.address)).to.equal(big("20551100000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("228345555555556"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("799209444444443"));

                    });

                });

                describe("Rebase test with custom supplyDelta: -27500 tokens (-2.7555%)...", () => {

                    beforeEach(() => {
                        supplyDelta = big(578655).mul(10**DECIMALS).mul(-1);
                        newTotalSupply = totalSupply.sub(supplyDelta.abs());
                    });

                    it("Total supply should increase by supply delta", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token.totalSupply()).to.equal(newTotalSupply);
                    });

                    it("Rebase event should be emitted on successful rebase", async () => {
                        await expect(token.rebase(supplyDelta))
                            .to.emit(token, "Rebase")
                            .withArgs(epoch + 1, newTotalSupply);
                    });

                    it("Epoch should increase by 1", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(epoch + 1);
                    });

                    it("User balances should increase by the appropriate percentage", async () => {
                        
                        await token.transfer(user1.address, big("222222222222223"));
                        await token.transfer(user2.address, big("777777777777777"));

                        await token.rebase(supplyDelta);

                        expect(await token.balanceOf(owner.address)).to.equal(big("19448900000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("216098888888889"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("756346111111110"));

                    });

                });

                describe("When rebase causes total supply to exceed max...", () => {

                    beforeEach(() => {
                        supplyDelta = MAX_UINT128;
                    });

                    it("Total supply should be capped at max", async () => {
                        await token.rebase(supplyDelta);
                        expect(await token.totalSupply()).to.equal(MAX_UINT128);
                    });

                });

                describe("Extensive testing of multiple positive and negative 1% rebases...", () => {

                    it("Total supply, epoch, and user balances should update correctly", async () => {

                        await token.transfer(user1.address, big("222222222222223"));
                        await token.transfer(user2.address, big("777777777777777"));
                        
                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(1);
                        expect(await token.totalSupply()).to.equal(big("21210000000000000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20200000000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("224444444444445"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("785555555555554"));

                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(2);
                        expect(await token.totalSupply()).to.equal(big("21422100000000000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20402000000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("226688888888889"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("793411111111110"));

                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(3);
                        expect(await token.totalSupply()).to.equal(big("21636321000000000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20606020000000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("228955777777778"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("801345222222221"));

                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(4);
                        expect(await token.totalSupply()).to.equal(big("21852684210000000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20812080200000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("231245335555556"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("809358674444443"));

                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(5);
                        expect(await token.totalSupply()).to.equal(big("22071211052100000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21020201002000000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("233557788911111"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("817452261188888"));

                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(6);
                        expect(await token.totalSupply()).to.equal(big("21850498941579000"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20809998991980000"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("231222211022000"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("809277738576999"));

                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(7);
                        expect(await token.totalSupply()).to.equal(big("21631993952163210"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20601899002060200"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("228909988911780"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("801184961191229"));
                        
                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(8);
                        expect(await token.totalSupply()).to.equal(big("21415674012641578"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20395880012039598"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("226620889022662"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("793173111579316"));
                        
                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(9);
                        expect(await token.totalSupply()).to.equal(big("21629830752767993"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20599838812159993"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("228887097912889"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("801104842695110"));

                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(10);
                        expect(await token.totalSupply()).to.equal(big("21846129060295672"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20805837200281592"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("231175968892018"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("809115891122061"));
                        
                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(11);
                        expect(await token.totalSupply()).to.equal(big("22064590350898628"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21013895572284407"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("233487728580938"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("817207050033281"));
                        
                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(12);
                        expect(await token.totalSupply()).to.equal(big("22285236254407614"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21224034528007251"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("235822605866748"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("825379120533614"));
                        
                        //Positive rebase
                        supplyDelta = (await token.totalSupply()).div(100);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(13);
                        expect(await token.totalSupply()).to.equal(big("22508088616951690"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21436274873287323"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("238180831925415"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("833632911738950"));
                        
                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(14);
                        expect(await token.totalSupply()).to.equal(big("22283007730782174"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21221912124554451"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("235799023606161"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("825296582621561"));
                        
                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(15);
                        expect(await token.totalSupply()).to.equal(big("22060177653474353"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("21009693003308907"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("233441033370099"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("817043616795345"));
                        
                        //Negative rebase
                        supplyDelta = (await token.totalSupply()).div(100).mul(-1);
                        await token.rebase(supplyDelta);
                        expect(await token._epoch()).to.equal(16);
                        expect(await token.totalSupply()).to.equal(big("21839575876939610"));
                        expect(await token.balanceOf(owner.address)).to.equal(big("20799596073275819"));
                        expect(await token.balanceOf(user1.address)).to.equal(big("231106623036398"));
                        expect(await token.balanceOf(user2.address)).to.equal(big("808873180627392"));

                    });

                });

            });

        });

    });

});