pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./lib/SafeMathInt.sol";

interface ISync {
    function sync() external;
}

interface IRebase {
    function rebase(int256 supplyDelta) external returns (uint256);
}

interface IUniswapRates {
    function getUsdcPerToken(address token, uint256 decimals, address pool) external view returns (uint256);
}

/**
 * @title Rebase Controller
 * @dev Manages the logic responsible for calling rebases on the token.
 */
contract RebaseController is Ownable {

    using SafeMath for uint256;
    using SafeMathInt for int256;

    address public _rebaseToken = address(0);
    address public _uniswapPool = address(0);
    address public _uniswapRates = address(0);
    address public _ecosystem = address(0);

    uint256 public _epoch = 0;
    uint256 public _lastRebase = 0;
    uint256 public _lastExchangeRate = 1;
    uint256 public _interval = 23 hours;

    uint256 public _rewardRounds = 20000;
    uint256 public _rewardMultiplier = 1;
    uint256 public _maxRewardMultiplier = 100;

    uint256 private constant _decimals = 9;

    event RebaseSuccess(uint256 lastExchangeRate, uint256 exchangeRate, int256 supplyDelta, uint256 epoch);
    event RebaseReward(address indexed user, uint256 amount);

    modifier canRebase() {
        require(_rebaseToken != address(0), "Rebase Controller: Rebase Token can't be the zero address");
        require(_uniswapPool != address(0), "Rebase Controller: Uniswap Pool can't be the zero address");
        require(_uniswapRates != address(0), "Rebase Controller: Uniswap Rates can't be the zero address");
        require(now > _lastRebase.add(_interval), "Rebase Controller: Interval must pass before rebase can occur");
        _;
    }

    /**
     * @dev Rebase function callable by any external user.
     */
    function rebase() external canRebase {
        
        require(msg.sender == tx.origin);
        
        uint256 exchangeRate = getCurrentExchangeRate();
        int256 supplyDelta = getSupplyDelta(exchangeRate);

        IRebase(_rebaseToken).rebase(supplyDelta);
        syncLiquidityPools();

        uint256 reward = getBaseReward();
        if (reward > 0) {

            reward = reward.mul(_rewardMultiplier);
            _rewardRounds = _rewardRounds.sub(min(_rewardRounds, _rewardMultiplier));

            if (exchangeRate > _lastExchangeRate) _rewardMultiplier = min(_rewardMultiplier.add(1), _maxRewardMultiplier);
            if (exchangeRate <= _lastExchangeRate) _rewardMultiplier = 1;

            require(IERC20(_rebaseToken).transfer(msg.sender, reward));
            emit RebaseReward(msg.sender, reward);
            
        }

        _epoch = _epoch.add(1);
        emit RebaseSuccess(_lastExchangeRate, exchangeRate, supplyDelta, _epoch);

        _lastRebase = now;
        _lastExchangeRate = exchangeRate;

    }

    /**
     * @return The current exchange rate of the token measured in USDC.
     */
    function getCurrentExchangeRate() public view returns (uint256) {
        return IUniswapRates(_uniswapRates).getUsdcPerToken(_rebaseToken, _decimals, _uniswapPool);
    }

    /**
     * @param exchangeRate The current exchange rate of the token measured in USDC.
     * @return The number of tokens that should be added or removed in the next rebase.
     */
    function getSupplyDelta(uint256 exchangeRate) public view returns (int256) {
        
        if (exchangeRate == _lastExchangeRate) return 0;

        uint256 totalSupply = IERC20(_rebaseToken).totalSupply();
        uint256 difference = diff(exchangeRate, _lastExchangeRate);

        uint256 pureSupplyDelta = totalSupply.mul(difference).div(_lastExchangeRate);
        uint256 maxSupplyDelta = totalSupply.div(100);

        uint256 supplyDelta = min(pureSupplyDelta, maxSupplyDelta);
        require(supplyDelta <= maxSupplyDelta, "Rebase Controller: Invalid supply delta; exceeds maximum of 1%");
        
        if (exchangeRate > _lastExchangeRate) return int256(supplyDelta);
        if (exchangeRate < _lastExchangeRate) return int256(-supplyDelta);

    }

    /**
     * @return The number of seconds until rebase can occur.
     */
    function secondsUntilRebase() public view returns (uint256) {
        return now >= _lastRebase.add(_interval) ? 0 : _lastRebase.add(_interval).sub(now);
    }

    /**
     * @dev Sync necessary liquidity pools after rebase to maintain proper balances.
     */
    function syncLiquidityPools() public {
        ISync(_uniswapPool).sync();
    }

    /**
     * @return The current base reward for calling rebase.
     */
    function getBaseReward() public view returns (uint256) {
        if (_rewardRounds == 0) return 0;
        return currentBalance().div(_rewardRounds);
    }

    /**
     * @return The current balance of tokens owned by the contract.
     */
    function currentBalance() public view returns (uint256) {
        return IERC20(_rebaseToken).balanceOf(address(this));
    }

    /**
     * @return The difference between two given values.
     */
    function diff(uint256 a, uint256 b) private pure returns (uint256) {
        return max(a, b).sub(min(a, b));
    }

    /**
     * @return The maximum of two given values.
     */
    function max(uint256 a, uint256 b) private pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @return The minimum of two given values.
     */
    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a <= b ? a : b;
    }

    /**
     * @param token The address of the rebase token.
     */
    function setRebaseToken(address token) external onlyOwner {
        _rebaseToken = token;
    }

    /**
     * @param pool The address of the WETH/TOKEN Uniswap pool.
     */
    function setUniswapPool(address pool) external onlyOwner {
        _uniswapPool = pool;
    }

    /**
     * @param rates The address of the Uniswap Rates contract.
     */
    function setUniswapRates(address rates) external onlyOwner {
        _uniswapRates = rates;
    }

    /**
     * @param interval The amount of time to wait between rebases.
     */
    function setInterval(uint256 interval) external onlyOwner {
        _interval = interval;
    }

    /**
     * @param rounds The number of rounds that rewards will be distributed.
     */
    function setRewardRounds(uint256 rounds) external onlyOwner {
        _rewardRounds = rounds;
    }

    /**
     * @param multiplier The maximum multiplier achievable through consecutive positive rebases.
     */
    function setMaxRewardMultiplier(uint256 multiplier) external onlyOwner {
        _maxRewardMultiplier = multiplier;
    }

    /**
     * @param ecosystem The address of the ecosystem pool.
     */
    function setEcosystemPool(address ecosystem) external onlyOwner {
        _ecosystem = ecosystem;
    }

    /**
     * @dev Transfers all remaining tokens to the ecosystem pool for reallocation.
     */
    function conclude() external onlyOwner {

        require(_rebaseToken != address(0), "Rebase Controller: The rebase token address has not been set");
        require(_ecosystem != address(0), "Rebase Controller: The ecosystem pool address has not been set");
        
        IERC20(_rebaseToken).transfer(_ecosystem, currentBalance());
        
    }

}