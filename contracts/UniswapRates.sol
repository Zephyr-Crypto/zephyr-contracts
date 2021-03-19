pragma solidity 0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Uniswap Exchange Rates
 * @dev Calculates the exchange rate of ERC20 tokens on Uniswap based on the WETH/USDC pool.
 */
contract UniswapRates {

    using SafeMath for uint256;
    
    address public constant WETH_USDC_UNISWAP_POOL = 0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc;

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint256 public constant WETH_DECIMALS = 18;

    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    uint256 public constant USDC_DECIMALS = 6;

    /**
     * @return The amount of USDC (in base units) per 1 ETH.
     */
    function getUsdcPerEth() public view returns (uint256) {
        return getTokenPerEth(USDC, WETH_USDC_UNISWAP_POOL);
    }

    /**
     * @return The amount of ETH (in wei) per 1 USDC.
     */
    function getEthPerUsdc() public view returns (uint256) {
        return getEthPerToken(USDC, USDC_DECIMALS, WETH_USDC_UNISWAP_POOL);
    }

    /**
     * @param token The ERC20 token address.
     * @param pool The TOKEN/WETH pool address.
     * @return The amount of TOKEN (in base units) per 1 USDC.
     */
    function getTokenPerUsdc(address token, address pool) public view returns (uint256) {
        return getTokenPerEth(token, pool).mul(10**USDC_DECIMALS).div(getUsdcPerEth());
    }

    /**
     * @param token The ERC20 token address.
     * @param decimals The number of decimals the token uses.
     * @param pool The TOKEN/WETH pool address.
     * @return The amount of USDC (in base units) per 1 TOKEN.
     */
    function getUsdcPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
        return getUsdcPerEth().mul(10**decimals).div(getTokenPerEth(token, pool));
    }

    /**
     * @param token The ERC20 token address.
     * @param pool The TOKEN/WETH pool address.
     * @return The amount of TOKEN (in base units) per 1 ETH.
     */
    function getTokenPerEth(address token, address pool) public view returns (uint256) {
        uint256 wethBalance = IERC20(WETH).balanceOf(pool);
        uint256 tokenBalance = IERC20(token).balanceOf(pool);
        return tokenBalance.mul(10**WETH_DECIMALS).div(wethBalance);
    }

    /**
     * @param token The ERC20 token address.
     * @param decimals The number of decimals the token uses.
     * @param pool The TOKEN/WETH pool address.
     * @return The amount of ETH (in wei) per 1 TOKEN.
     */
    function getEthPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
        uint256 wethBalance = IERC20(WETH).balanceOf(pool);
        uint256 tokenBalance = IERC20(token).balanceOf(pool);
        return wethBalance.mul(10**decimals).div(tokenBalance);
    }

}