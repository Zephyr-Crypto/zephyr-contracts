pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract YfkaExchange is Ownable {

    using SafeMath for uint256;

    address public _yfka = address(0);
    address public _zphr = address(0);
    address public _ecosystem = address(0);

    mapping(address => uint256) private _yfkaExchanged; 
    mapping(address => uint256) private _zphrRedeemed; 

    uint256 public _yfkaExchangeLimit = 100000e18;

    uint256 private constant YFKA_DECIMALS = 18;

    event Exchanged(address indexed user, uint256 yfkaAccepted, uint256 zphrAwarded);

    modifier canExchange() {
        require(_yfka != address(0), "YfkaExchange: YFKA can't be the zero address");
        require(_zphr != address(0), "YfkaExchange: ZPHR can't be the zero address");
        require(currentBalance() > 0, "YfkaExchange: ZPHR balance must be greater than zero");
        require(totalYfkaExchanged() < _yfkaExchangeLimit, "YfkaExchange: The maximum amount of YFKA has been exchanged");
        _;
    }

    /**
     * @dev Redeem ZPHR tokens in exchange for farmed YFKA tokens.  The amount to exchange 
     * must be approved on the YFKA contract in advance.  YFKA tokens cannot be retrieved
     * once they have been sent to the contract and exchanged for ZPHR.
     * @param amount The amount of YFKA to exchange.
     */
    function exchange(uint256 amount) external canExchange {

        uint256 yfkaAccepted = min(amount, _yfkaExchangeLimit.sub(totalYfkaExchanged()));
        uint256 zphrAwarded = exchangeRate().mul(yfkaAccepted).div(10**YFKA_DECIMALS);

        require(IERC20(_yfka).transferFrom(msg.sender, address(this), yfkaAccepted));
        require(IERC20(_zphr).transfer(msg.sender, zphrAwarded));

        _yfkaExchanged[msg.sender] = _yfkaExchanged[msg.sender].add(yfkaAccepted);
        _zphrRedeemed[msg.sender] = _zphrRedeemed[msg.sender].add(zphrAwarded);

        emit Exchanged(msg.sender, yfkaAccepted, zphrAwarded);

    }

    /**
     * @return The exchange rate of ZPHR tokens per 1 YFKA.
     */
    function exchangeRate() public view returns (uint256) {
        if (totalYfkaExchanged() >= _yfkaExchangeLimit) return 0;
        return currentBalance().mul(10**YFKA_DECIMALS).div(_yfkaExchangeLimit.sub(totalYfkaExchanged()));
    }

    /**
     * @return The current balance of ZPHR tokens owned by the contract.
     */
    function currentBalance() public view returns (uint256) {
        return IERC20(_zphr).balanceOf(address(this));
    }

    /**
     * @return The total amount of YFKA tokens that have been exchanged.
     */
    function totalYfkaExchanged() public view returns (uint256) {
        return IERC20(_yfka).balanceOf(address(this));
    }

    /**
     * @return The total amount of YFKA exchanged by the given account.
     */
    function yfkaExchanged(address account) public view returns (uint256) {
        return _yfkaExchanged[account];
    }

    /**
     * @return The total amount of ZPHR redeemed by the given account.
     */
    function zphrRedeemed(address account) public view returns (uint256) {
        return _zphrRedeemed[account];
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
     * @param yfka The address of the YFKA token.
     */
    function setYfka(address yfka) external onlyOwner {
        _yfka = yfka;
    }

    /**
     * @param zphr The address of the ZPHR token.
     */
    function setZphr(address zphr) external onlyOwner {
        _zphr = zphr;
    }

    /**
     * @param ecosystem The address of the ecosystem pool.
     */
    function setEcosystemPool(address ecosystem) external onlyOwner {
        _ecosystem = ecosystem;
    }

    /**
     * @param limit The total amount of YFKA tokens that the contract can exchange.
     */
    function setYfkaExchangeLimit(uint256 limit) external onlyOwner {
        _yfkaExchangeLimit = limit;
    }

    /**
     * @dev Transfers all remaining ZPHR tokens to the ecosystem pool for reallocation.
     */
    function conclude() external onlyOwner {

        require(_zphr != address(0), "YfkaExchange: The ZPHR token has not been set");
        require(_ecosystem != address(0), "YfkaExchange: The ecosystem pool address has not been set");
        
        IERC20(_zphr).transfer(_ecosystem, currentBalance());
        
    }

}