pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Staking Rewards Pool
 * @dev Basic pool which manages rewards for users staking liquidity tokens.
 * The pool distributes rewards over a given period of time based on ownership 
 * percentage and the amount of time the liquidity tokens have been staked.
 */
contract StakingPool is Ownable {

    using SafeMath for uint256;

    uint256 private constant UNI_TOKEN_DECIMALS = 18;

    address public _token = address(0);
    address public _uniToken = address(0); 
    address public _ecosystem = address(0);

    //A unique staking event
    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    //Aggregated user statistics
    struct Stats {
        uint256 amountStaked;
        uint256 secondsStaked;
        uint256 numberOfStakes;
        uint256 pointsEarned;
        uint256 lastAccounting;
    }

    //The aggregated statistics for each user
    mapping (address => Stats) private _stats;

    //The collection of stakes belonging to each user
    mapping (address => Stake[]) private _stakes;

    //Global statistics
    uint256 private _globalSecondsStaked;
    uint256 private _globalNumberOfStakes;
    uint256 private _globalPointsEarned;
    uint256 private _globalLastAccounting;

    struct Fraction {
        uint256 numerator;
        uint256 denominator;
    }

    //The fraction to multiply by current balance in order to determine the original balance
    Fraction public _originalBalance = Fraction(1, 1);

    //Staking period details
    uint256 public _secondsInFullPeriod;
    uint256 public _timestampPeriodBegan;
    uint256 public _timestampPeriodEnds;

    bool public _emergency = false;

    event Staked(address indexed user, uint256 amount);
    event Redeemed(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    modifier validConditions() {
        require(_token != address(0), "StakingPool: Reward token has not been set");
        require(_uniToken != address(0), "StakingPool: Liquidity token has not been set");
        require(_timestampPeriodBegan > 0, "StakingPool: The staking period has not started yet");
        require(!_emergency, "StakingPool: The staking pool is in a state of emergency");
        _;
    }

    // STAKING AND UNSTAKING --------------------------------------------------------------------------------- //

    /**
     * @dev Stake liquidity tokens to earn rewards.
     * @param amount The amount of liquidity tokens to stake.  This amount must be
     * approved on the Uniswap token contract in advance.
     */
    function stake(uint256 amount) external validConditions {

        require(now < _timestampPeriodEnds, "StakingPool: The staking period has ended");
        require(amount > 0, "StakingPool: Amount must be greater than zero");

        //Record the user's stake
        _stakes[msg.sender].push(Stake(amount, now));

        //Update user statistics
        Stats storage stats = _stats[msg.sender];
        stats.pointsEarned = pointsEarned(msg.sender);
        stats.secondsStaked = secondsStaked(msg.sender);
        stats.amountStaked = stats.amountStaked.add(amount);
        stats.numberOfStakes = stats.numberOfStakes.add(1);
        stats.lastAccounting = now;

        //Update global statistics
        _globalPointsEarned = globalPointsEarned();
        _globalSecondsStaked = globalSecondsStaked();
        _globalNumberOfStakes = _globalNumberOfStakes.add(1);
        _globalLastAccounting = now;

        //Transfer the liquidity tokens
        require(IERC20(_uniToken).transferFrom(msg.sender, address(this), amount));

        emit Staked(msg.sender, amount);

    }

    /**
     * @dev Unstake liquidity tokens and redeem accrued rewards.
     * @param amount The amount of liquidity tokens to unstake.
     */
    function unstake(uint256 amount) external validConditions {

        require(amount <= amountStaked(msg.sender), "StakingPool: Amount is greater than staking balance");
        require(amount > 0, "StakingPool: Amount must be greater than zero");
        
        uint256 pointsToBurn = 0;
        uint256 secondsToBurn = 0;
        uint256 stakesToBurn = 0;

        uint256 secondsOverflow = secondsOverflow();

        uint256 amountRemaining = amount;
        Stake[] storage userStakes = _stakes[msg.sender];

        //Loop backwards (LIFO) through the user's stakes until the desired amount has been counted
        while (amountRemaining > 0) {

            Stake storage lastStake = userStakes[userStakes.length - 1];
            uint256 secondsStaked = now.sub(lastStake.timestamp).sub(secondsOverflow);

            //Fully or partially redeem the stake, depending on amount remaining
            if (amountRemaining >= lastStake.amount) {

                pointsToBurn = pointsToBurn.add(pointValue(lastStake.amount, secondsStaked));
                stakesToBurn = stakesToBurn.add(1);
                secondsToBurn = secondsToBurn.add(secondsStaked);
                
                amountRemaining = amountRemaining.sub(lastStake.amount);
                userStakes.pop();

            } else {

                pointsToBurn = pointsToBurn.add(pointValue(amountRemaining, secondsStaked));

                lastStake.amount = lastStake.amount.sub(amountRemaining);
                amountRemaining = 0;
                
            }

        }

        //Determine what the user's rewards should be, based on their accrued points
        uint256 rewards = rewardValue(pointsToBurn);
        require(rewards <= rewardsAvailable(), "StakingPool: Rewards calculated exceed rewards available");

        //User Accounting
        Stats storage stats = _stats[msg.sender];
        stats.pointsEarned = pointsEarned(msg.sender).sub(pointsToBurn);
        stats.secondsStaked = secondsStaked(msg.sender).sub(secondsToBurn);
        stats.amountStaked = stats.amountStaked.sub(amount);
        stats.numberOfStakes = stats.numberOfStakes.sub(stakesToBurn);
        stats.lastAccounting = now.sub(secondsOverflow);

        //Global Accounting
        _globalPointsEarned = globalPointsEarned().sub(pointsToBurn);
        _globalSecondsStaked = globalSecondsStaked().sub(secondsToBurn);
        _globalNumberOfStakes = _globalNumberOfStakes.sub(stakesToBurn);
        _globalLastAccounting = now.sub(secondsOverflow);

        //Update the original balance fraction
        _originalBalance.numerator = originalRewardBalance();
        _originalBalance.denominator = currentRewardBalance().sub(rewards);
        
        //Transfer the reward tokens
        require(IERC20(_token).transfer(msg.sender, rewards));

        //Transfer the liquidity tokens
        require(IERC20(_uniToken).transfer(msg.sender, amount));

        emit Redeemed(msg.sender, rewards);
        emit Unstaked(msg.sender, amount);

    }

    // USER STATISTICS --------------------------------------------------------------------------------------- //

    /**
     * @return The total amount of Uniswap tokens staked by the user.
     */
    function amountStaked(address user) public view returns (uint256) {
        return _stats[user].amountStaked;
    }

    /**
     * @return The total number of seconds staked by the user.
     */
    function secondsStaked(address user) public view returns (uint256) {
        if (numberOfStakes(user) == 0) return 0;
        return _stats[user].secondsStaked.add(secondsUnaccounted(user).mul(numberOfStakes(user)));
    }

    /**
     * @return The number of points that the user has earned from all stakes.
     */
    function pointsEarned(address user) public view returns (uint256) {
        if (numberOfStakes(user) == 0) return 0;
        return _stats[user].pointsEarned.add(secondsUnaccounted(user).mul(amountStaked(user)));
    }

    /**
     * @return The number of stakes that the user currently owns.
     */
    function numberOfStakes(address user) public view returns (uint256) {
        return _stats[user].numberOfStakes;
    }

    /**
     * @return The number of seconds that have passed since last user accounting.
     */
    function secondsUnaccounted(address user) public view returns (uint256) {
        if (numberOfStakes(user) == 0) return 0;
        return now.sub(_stats[user].lastAccounting).sub(secondsOverflow());
    }

    // GLOBAL STATISTICS ------------------------------------------------------------------------------------- //

    /**
     * @return The total number of Uniswap tokens staked by all users.
     */
    function globalAmountStaked() public view returns (uint256) {
        return IERC20(_uniToken).balanceOf(address(this));
    }

    /**
     * @return The number of seconds staked by all users collectively.
     */
    function globalSecondsStaked() public view returns (uint256) {    
        if (globalNumberOfStakes() == 0) return 0;
        return _globalSecondsStaked.add(globalSecondsUnaccounted().mul(globalNumberOfStakes()));
    }

    /**
     * @return The number of reward points earned by all users collectively.
     */
    function globalPointsEarned() public view returns (uint256) {
        if (globalNumberOfStakes() == 0) return 0;
        return _globalPointsEarned.add(globalSecondsUnaccounted().mul(globalAmountStaked()));
    }

    /**
     * @return The number of stakes that are owned by all users collectively.
     */
    function globalNumberOfStakes() public view returns (uint256) {
        return _globalNumberOfStakes;
    }

    /**
     * @return The number of seconds that have passed since last global accounting.
     */
    function globalSecondsUnaccounted() public view returns (uint256) {
        if (globalNumberOfStakes() == 0) return 0;
        return now.sub(_globalLastAccounting).sub(secondsOverflow());
    }

    // REWARD CALCULATIONS ----------------------------------------------------------------------------------- //

    /**
     * @return The number of reward points that the given amount and seconds staked are worth.
     */
    function pointValue(uint256 amountStaked, uint256 secondsStaked) public pure returns (uint256) {
        return amountStaked.mul(secondsStaked);
    }

    /**
     * @return The original balance of token rewards, factoring in any rebases that have
     * occurred since the contract launched.  
     */
    function originalRewardBalance() public view returns (uint256) {
        return currentRewardBalance().mul(_originalBalance.numerator).div(max(_originalBalance.denominator, 1));
    }

    /**
     * @return The current balance of token rewards owned by the contract.
     */
    function currentRewardBalance() public view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @return The amount of rewards that the user has earned with their current stakes.
     */
    function rewardsEarned(address user) public view returns (uint256) {
        return rewardValue(pointsEarned(user));
    }

    /**
     * @return The token rewards for a given amount of points at this specific moment in time.
     */
    function rewardValue(uint256 points) public view returns (uint256) {
        return points.mul(rewardsPerPoint()).div(10**UNI_TOKEN_DECIMALS);
    }

    /**
     * @return The current reward value of a single point.
     */
    function rewardsPerPoint() public view returns (uint256) {
        return rewardsAvailable().mul(10**UNI_TOKEN_DECIMALS).div(max(globalPointsEarned(), 1));
    }

    /**
     * @return The total amount of rewards that are currently available to redeem.
     */
    function rewardsAvailable() public view returns (uint256) {

        //Variables necessary for calculation
        uint256 secondsElapsedInPeriod = secondsElapsedInPeriod();
        uint256 originalRewardBalance = originalRewardBalance();
        uint256 currentRewardBalance = currentRewardBalance();

        //Fraction of Rewards Unlocked
        uint256 a = secondsElapsedInPeriod;
        uint256 b = _secondsInFullPeriod;

        //Fraction of Rewards Claimed
        uint256 c = originalRewardBalance.sub(currentRewardBalance);
        uint256 d = originalRewardBalance;

        //Rewards Available = Rewards Unlocked - Rewards Claimed
        uint256 numerator = (a.mul(d)).sub(b.mul(c));
        uint256 denominator = b.mul(d);

        return originalRewardBalance.mul(numerator).div(denominator);

    }

    /**
     * @return The number of seconds that have elapsed in the rewards period.
     */
    function secondsElapsedInPeriod() public view returns (uint256) {
        return min(now.sub(_timestampPeriodBegan), _secondsInFullPeriod);
    }

    /**
     * @return The number of seconds that are remaining in the rewards period.
     */
    function secondsRemainingInPeriod() public view returns (uint256) {
        if (now < _timestampPeriodEnds) return _timestampPeriodEnds.sub(now);
        return 0;
    }

    /**
     * @return The number of seconds that have elapsed since the rewards period ended.
     */
    function secondsOverflow() public view returns (uint256) {
        if (now > _timestampPeriodEnds) return now.sub(_timestampPeriodEnds);
        return 0;
    }

    /**
     * @return The amount of rewards unlocked as compared to the original reward balance.
     * Rewards are unlocked based on the percentage of time elapsed in the period.
     */
    function rewardsUnlocked() public view returns (uint256) {
        return originalRewardBalance().mul(secondsElapsedInPeriod()).div(_secondsInFullPeriod);
    }

    /**
     * @return The amount of rewards claimed as compared to the original reward balance.
     */
    function rewardsClaimed() public view returns (uint256) {
        uint256 originalRewardBalance = originalRewardBalance();
        return originalRewardBalance.mul(originalRewardBalance.sub(currentRewardBalance())).div(originalRewardBalance);
    }

    // UTILITIES --------------------------------------------------------------------------------------------- //

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
     * @param token The address of the reward token.
     */
    function setToken(address token) external onlyOwner {
        _token = token;
    }
    
    /**
     * @param uniToken The address of the Uniswap liquidity pool token.
     */
    function setUniToken(address uniToken) external onlyOwner {
        _uniToken = uniToken;
    }
    
    /**
     * @param ecosystem The address of the ecosystem pool.
     */
    function setEcosystemPool(address ecosystem) external onlyOwner {
        _ecosystem = ecosystem;
    }

    /**
     * @dev Initiates the staking pool's reward period.
     * @param duration The amount of time in seconds that the staking period will last.
     */
    function beginStakingPeriod(uint256 duration) external onlyOwner {

        require(_token != address(0), "StakingPool: The reward token has not been set");
        require(currentRewardBalance() > 0, "StakingPool: The token balance of the contract is zero");

        _secondsInFullPeriod = duration;
        _timestampPeriodBegan = now;
        _timestampPeriodEnds = now.add(duration);

    }

    /**
     * @dev Transfers all remaining reward tokens to the ecosystem pool for reallocation.
     */
    function conclude() external onlyOwner {

        require(_token != address(0), "StakingPool: The reward token has not been set");
        require(_ecosystem != address(0), "StakingPool: The ecosystem pool address has not been set");
        
        IERC20(_token).transfer(_ecosystem, currentRewardBalance());
        
    }

    /**
     * @dev Sets the reward pool to a state of emergency.  This action can't be undone.
     * Ordinary staking and unstaking functions are disabled, and token rewards are not distributed.
     * Users can retrieve their liquidity tokens using the emergencyUnstake() function.
     */
    function declareEmergency() external onlyOwner {
        _emergency = true;
    }

    /**
     * @dev Allows users to withdraw liquidity tokens in the event of a catastrophic error.
     */
    function emergencyUnstake() external {
        
        require(_emergency, "StakingPool: Pool is not in a state of emergency");
        require(_uniToken != address(0), "StakingPool: Liquidity token has not been set");
        
        uint256 amount = amountStaked(msg.sender);
        require(amount > 0, "StakingPool: Insufficient staking balance");
        
        _stats[msg.sender].amountStaked = 0;
        require(IERC20(_uniToken).transfer(msg.sender, amount));

        emit Unstaked(msg.sender, amount);
        
    }

    /**
     * @dev Allows dev to rescue all liquidity tokens to the ecosystem pool in the event 
     * of a catastrophic error.  To be used only if emergencyUnstake() fails.  Liquidity
     * tokens can then be returned to users through a merkle distribution contract.
     */
    function emergencyRescue() external onlyOwner {
        
        require(_emergency, "StakingPool: Pool is not in a state of emergency");
        require(_uniToken != address(0), "StakingPool: Liquidity token has not been set");
        require(_ecosystem != address(0), "StakingPool: The ecosystem pool address has not been set");

        require(IERC20(_uniToken).transfer(_ecosystem, globalAmountStaked()));

    }

}