pragma solidity 0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./lib/IBEP20.sol";

/**
 * @title PancakeSwap Exchange Rates
 * @dev Calculates the exchange rate of BEP20 tokens on PancakeSwap based on the WBNB/BUSD pool.
 */
contract PancakeSwapRates {

    using SafeMath for uint256;
    
    address public constant WBNB_BUSD_PANCAKESWAP_POOL = 0x1B96B92314C44b159149f7E0303511fB2Fc4774f;

    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    uint256 public constant WBNB_DECIMALS = 18;

    address public constant BUSD = 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56;
    uint256 public constant BUSD_DECIMALS = 18;

    /**
     * @return The amount of BUSD (in base units) per 1 BNB.
     */
    function getBusdPerBnb() public view returns (uint256) {
        return getTokenPerBnb(BUSD, WBNB_BUSD_PANCAKESWAP_POOL);
    }

    /**
     * @return The amount of BNB (in base units) per 1 BUSD.
     */
    function getBnbPerBusd() public view returns (uint256) {
        return getBnbPerToken(BUSD, BUSD_DECIMALS, WBNB_BUSD_PANCAKESWAP_POOL);
    }

    /**
     * @param token The BEP20 token address.
     * @param pool The TOKEN/WBNB pool address.
     * @return The amount of TOKEN (in base units) per 1 BUSD.
     */
    function getTokenPerBusd(address token, address pool) public view returns (uint256) {
        return getTokenPerBnb(token, pool).mul(10**BUSD_DECIMALS).div(getBusdPerBnb());
    }

    /**
     * @param token The BEP20 token address.
     * @param decimals The number of decimals the token uses.
     * @param pool The TOKEN/WBNB pool address.
     * @return The amount of BUSD (in base units) per 1 TOKEN.
     */
    function getBusdPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
        return getBusdPerBnb().mul(10**decimals).div(getTokenPerBnb(token, pool));
    }

    /**
     * @dev Alias for getBusdPerToken, used by Zephyr Rebase Controller.
     */
    function getUsdcPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
        return getBusdPerToken(token, decimals, pool);
    }

    /**
     * @param token The BEP20 token address.
     * @param pool The TOKEN/WBNB pool address.
     * @return The amount of TOKEN (in base units) per 1 BNB.
     */
    function getTokenPerBnb(address token, address pool) public view returns (uint256) {
        uint256 wbnbBalance = IBEP20(WBNB).balanceOf(pool);
        uint256 tokenBalance = IBEP20(token).balanceOf(pool);
        return tokenBalance.mul(10**WBNB_DECIMALS).div(wbnbBalance);
    }

    /**
     * @param token The BEP20 token address.
     * @param decimals The number of decimals the token uses.
     * @param pool The TOKEN/WBNB pool address.
     * @return The amount of BNB (in base units) per 1 TOKEN.
     */
     function getBnbPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
         uint256 wbnbBalance = IBEP20(WBNB).balanceOf(pool);
         uint256 tokenBalance = IBEP20(token).balanceOf(pool);
         return wbnbBalance.mul(10**decimals).div(tokenBalance);
     }

}