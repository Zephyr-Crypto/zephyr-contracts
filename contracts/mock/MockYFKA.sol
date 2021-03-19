pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockYFKA is ERC20, Ownable {

    uint256 public _supply = 250000e18;

    constructor() public ERC20("MockYFKA", "MOCKYFKA") {
        _mint(msg.sender, _supply);
    }

    function mint(address user, uint256 amount) public onlyOwner {
        _mint(user, amount);
    }

}