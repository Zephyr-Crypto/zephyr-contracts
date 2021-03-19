pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUniswapRates {

    using SafeMath for uint256;
    
    uint256 public _price = 100000000;

    function getUsdcPerToken(address token, uint256 decimals, address pool) public view returns (uint256) {
        token == token; //get rid of hardhat warning
        decimals == decimals; //get rid of hardhat warning
        pool == pool; //get rid of hardhat warning
        return _price;
    }

    function add(uint256 amount) public {
        _price = _price.add(amount);
    }

    function sub(uint256 amount) public {
        _price = _price.sub(amount);
    }

    function set(uint256 price) public {
        _price = price;
    }

}