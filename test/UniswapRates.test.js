const { expect } = require("chai");
const { ethers } = require("hardhat");

return;

function big(number) {
    return ethers.BigNumber.from(number);
}

/**
 * Run these tests by forking mainnet at block 11660617
 */
describe("UNISWAP EXCHANGE RATES", () => {

    let token;
    let decimals;
    let pool;    

    beforeEach(async () => {

        factory = await ethers.getContractFactory("UniswapRates");
        rates = await factory.deploy();
        
        [owner, user1, user2, ...users] = await ethers.getSigners();

        //AMPL token
        token = "0xD46bA6D942050d489DBd938a2C909A5d5039A161";
        decimals = 9;
        pool = "0xc5be99A02C6857f9Eac67BbCE58DF5572498F40c";

    });

    it("Get USDC per ETH", async () => {
        expect(await rates.getUsdcPerEth()).to.equal(big("1162872396"));
    });

    it("Get ETH per USDC", async () => {
        expect(await rates.getEthPerUsdc()).to.equal(big("859939580007014"));
    });

    it("Get AMPL per USDC", async () => {
        expect(await rates.getTokenPerUsdc(token, pool)).to.equal(big("1169169121"));
    });

    it("Get USDC per AMPL", async () => {
        expect(await rates.getUsdcPerToken(token, decimals, pool)).to.equal(big("855308"));
    });

    it("Get AMPL per ETH", async () => {
        expect(await rates.getTokenPerEth(token, pool)).to.equal(big("1359594498036"));
    });

    it("Get ETH per AMPL", async () => {
        expect(await rates.getEthPerToken(token, decimals, pool)).to.equal(big("735513420688465"));
    });

});