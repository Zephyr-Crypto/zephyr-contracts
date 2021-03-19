pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUniswapPool is ERC20, Ownable {

    uint256 public _supply = 50000e18;

    constructor() public ERC20("MockUniswapPool", "POOL") {
        _mint(msg.sender, _supply);
    }

    function sync() public {
        //do nothing
    }

}