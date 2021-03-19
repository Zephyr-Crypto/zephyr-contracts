pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./lib/SafeMathInt.sol";

/**
 * @title Zephyr Token
 * @dev A rebasing token derived from Ampleforth (AMPL) and Antiample (XAMP).
 */
contract Zephyr is Ownable {

    using SafeMath for uint256;
    using SafeMathInt for int256;

    string public constant name = "Zephyr";
    string public constant symbol = "ZPHR"; 
    uint8 public constant decimals = 9; 

    uint256 private constant INITIAL_FRAGMENT_SUPPLY = 21000000e9;
    uint256 private constant MAX_FRAGMENT_SUPPLY = ~uint128(0);
    uint256 private constant MAX_UINT256 = ~uint256(0);
    uint256 private constant TOTAL_GONS = MAX_UINT256 - (MAX_UINT256 % INITIAL_FRAGMENT_SUPPLY);

    uint256 private _currentFragmentSupply; 
    uint256 private _gonsPerFragment;

    address public _rebaseController = address(0);
    uint256 public _epoch = 0;

    address public _developer = address(0);
    bool public _devFeeEnabled = false;

    mapping(address => uint256) private _gonBalances; 
    mapping(address => mapping(address => uint256)) private _allowedFragments;

    event Transfer(address indexed from, address indexed to, uint256 amount); 
    event Approval(address indexed owner, address indexed spender, uint256 amount); 
    event Rebase(uint256 indexed epoch, uint256 currentFragmentSupply);
    event DevFee(address indexed from, address indexed to, uint256 amount);
    
    modifier validRecipient(address to) {
        require(to != address(0));
        require(to != address(this));
        _;
    }

    modifier onlyRebaseController() {
        require(msg.sender == _rebaseController, "Zephyr: Function can only be called by the Rebase Controller");
        _;
    }

    constructor() public {

        _developer = owner();
        _rebaseController = owner();

        _currentFragmentSupply = INITIAL_FRAGMENT_SUPPLY; 
        _gonsPerFragment = TOTAL_GONS.div(_currentFragmentSupply);

        _gonBalances[owner()] = TOTAL_GONS; 
        emit Transfer(address(0), owner(), _currentFragmentSupply);

    }

    /**
     * @dev Rebases the current fragment supply based on a delta value provided by the rebase controller.
     * @param supplyDelta The amount of fragments to add or subtract from the current supply.
     * @return The new fragment supply.
     */
    function rebase(int256 supplyDelta) external onlyRebaseController returns (uint256) {

        if (supplyDelta == 0) {
            _epoch = _epoch.add(1);
            emit Rebase(_epoch, _currentFragmentSupply);
            return _currentFragmentSupply;
        }

        if (supplyDelta < 0) {
            _currentFragmentSupply = _currentFragmentSupply.sub(uint256(supplyDelta.abs()));
        } else {
            _currentFragmentSupply = _currentFragmentSupply.add(uint256(supplyDelta));
        }

        if (_currentFragmentSupply > MAX_FRAGMENT_SUPPLY) {
            _currentFragmentSupply = MAX_FRAGMENT_SUPPLY;
        }

        _gonsPerFragment = TOTAL_GONS.div(_currentFragmentSupply);

        _epoch = _epoch.add(1);
        emit Rebase(_epoch, _currentFragmentSupply);
        return _currentFragmentSupply;

    }

    /**
     * @param controller The address of the rebase controller.
     */
    function setRebaseController(address controller) external onlyOwner {
        _rebaseController = controller;
    }

    /**
     * @param developer The address of the developer.
     */
    function setDeveloper(address developer) external onlyOwner {
        _developer = developer;
    }

    /**
     * @param enabled True to enable developer fee on transfers, false to disable.
     */
    function setDevFeeEnabled(bool enabled) external onlyOwner {
        _devFeeEnabled = enabled;
    }

    /**
     * @return The current fragment supply.
     */
    function totalSupply() public view returns (uint256) {
        return _currentFragmentSupply;
    }

    /**
     * @param who The address of the user.
     * @return The user's balance of fragments.
     */
    function balanceOf(address who) public view returns (uint256) {
        return _gonBalances[who].div(_gonsPerFragment);
    }

    /**
     * @param to The address of the recipient.
     * @param amount The amount of fragments that should be transferred.
     * @return True if the transfer was successful, false otherwise.
     */
    function transfer(address to, uint256 amount) public validRecipient(to) returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    /**
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param amount The amount of fragments that should be transferred.
     * @return True if the transfer was successful, false otherwise.
     */
    function transferFrom(address from, address to, uint256 amount) public validRecipient(to) returns (bool) {
        _allowedFragments[from][msg.sender] = _allowedFragments[from][msg.sender].sub(amount);
        return _transfer(from, to, amount);
    }

    /**
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param amount The amount of fragments that should be transferred.
     * @return True if the transfer was successful, false otherwise.
     */
    function _transfer(address from, address to, uint256 amount) private returns (bool) {
        if (_devFeeEnabled) {
            return _transferWithFee(from, to, amount);
        } else {
            return _transferWithoutFee(from, to, amount);
        }
    }

    /**
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param amount The amount of fragments that should be transferred.
     * @return True if the transfer was successful, false otherwise.
     */
    function _transferWithFee(address from, address to, uint256 amount) private returns (bool) {

        uint256 devFee = amount.div(1000);
        uint256 remainder = amount.sub(devFee);

        _gonBalances[_developer] = _gonBalances[_developer].add(devFee.mul(_gonsPerFragment));
        _gonBalances[to] = _gonBalances[to].add(remainder.mul(_gonsPerFragment));
        _gonBalances[from] = _gonBalances[from].sub(amount.mul(_gonsPerFragment));

        emit DevFee(from, _developer, devFee);
        emit Transfer(from, to, remainder);
        return true;

    }

    /**
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param amount The amount of fragments that should be transferred.
     * @return True if the transfer was successful, false otherwise.
     */
    function _transferWithoutFee(address from, address to, uint256 amount) private returns (bool) {

        uint256 gonAmount = amount.mul(_gonsPerFragment);

        _gonBalances[from] = _gonBalances[from].sub(gonAmount);
        _gonBalances[to] = _gonBalances[to].add(gonAmount);

        emit Transfer(from, to, amount);
        return true;

    }

    /**
     * @param spender The address of the user or contract to grant transfer rights.
     * @param amount The amount of fragments the spender has the right to transfer.
     * @return True if the approval was successful, false otherwise.
     */
    function approve(address spender, uint256 amount) public returns (bool) {

        _allowedFragments[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;

    }

    /**
     * @param owner The owner of the fragments.
     * @param spender The address of the user or contract with transfer rights.
     * @return The amount of fragments the spender has the right to transfer.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowedFragments[owner][spender];
    }

    /**
     * @param spender The address of the user or contract to grant transfer rights.
     * @param amount The amount of fragments by which to increase the allowance.
     * @return True if the approval was successful, false otherwise.
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        
        _allowedFragments[msg.sender][spender] = _allowedFragments[msg.sender][spender].add(amount);
        emit Approval(msg.sender, spender, _allowedFragments[msg.sender][spender]);
        return true;

    }

    /**
     * @param spender The address of the user or contract to grant transfer rights.
     * @param amount The amount of fragments by which to decrease the allowance.
     * @return True if the approval was successful, false otherwise.
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        
        uint256 currentAllowance = _allowedFragments[msg.sender][spender];
        if (amount >= currentAllowance) {
            _allowedFragments[msg.sender][spender] = 0;
        } else {
            _allowedFragments[msg.sender][spender] = currentAllowance.sub(amount);
        }
        emit Approval(msg.sender, spender, _allowedFragments[msg.sender][spender]);
        return true;

    }

}