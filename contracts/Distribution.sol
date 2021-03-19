pragma solidity 0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Token Distribution
 * @dev Merkle distribution of tokens.
 */
contract Distribution is Ownable {

    using SafeMath for uint256;

    address public _token = address(0);
    address public _ecosystem = address(0);
    bytes32 public _root = 0;
    uint256 public _claimsAvailable = 0;

    mapping(uint256 => uint256) private _claims;

    event Claim(uint256 indexed index, address indexed account, uint256 amount);

    modifier canClaim() {
        require(_token != address(0), "Distribution: The token address has not been set");
        require(_root != 0, "Distribution: The root has not been set");
        require(_claimsAvailable > 0, "Distribution: The number of available claims is zero");
        require(currentBalance() > 0, "Distribution: The token balance of the contract is zero");
        _;
    }

    /** 
     * @dev Claim tokens by proving that your address is eligible.
     * @param index The index position of the caller's address in the merkle dataset array.
     * @param proof The hashes necessary to prove that the address belongs to the dataset.
     */
    function claim(uint256 index, bytes32[] calldata proof) external canClaim {

        require(!claimed(index), "Distribution: Tokens have already been claimed by this address");
        require(verify(index, proof), "Distribution: The proofs supplied were unable to validate this address");
        
        //Mark the index as claimed
        uint256 block_ = _claims[index.div(256)];
        uint256 mask_ = 1 << index.mod(256);
        _claims[index.div(256)] = block_ | mask_;

        uint256 amount = currentBalance().div(_claimsAvailable);
        _claimsAvailable = _claimsAvailable.sub(1);

        require(IERC20(_token).transfer(msg.sender, amount));

        emit Claim(index, msg.sender, amount);

    }

    /**
     * @dev Verify that the given proof validates the caller's address.
     * @param index The index position of the caller's address in the merkle dataset array.
     * @param proof The hashes necessary to prove that the address belongs to the dataset.
     * @return True if the caller's address could be verified with the proof, false otherwise.
     */
    function verify(uint256 index, bytes32[] memory proof) private view returns (bool) {

        //Get the leaf
        bytes32 hash_ = keccak256(abi.encodePacked(msg.sender));
        uint256 index_ = index;

        //Loop through the proofs
        for (uint256 i = 0; i < proof.length; i++) {
            if (index_.mod(2) == 0) {
                hash_ = keccak256(abi.encodePacked(hash_, proof[i]));
            } else {
                hash_ = keccak256(abi.encodePacked(proof[i], hash_));
            }
            index_ = index_.div(2);
        }

        return hash_ == _root;

    }

    /**
     * @param index The index of the address in the merkle dataset array.
     * @return True if the account at the given index has claimed tokens, false otherwise.
     */
    function claimed(uint256 index) public view returns (bool) {
        
        uint256 block_ = _claims[index.div(256)];
        uint256 mask_ = 1 << index.mod(256);
        return block_ & mask_ == mask_;

    }

    /**
     * @return The current balance of tokens owned by the contract.
     */
    function currentBalance() public view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @return The maximum of two given values.
     */
    function max(uint256 a, uint256 b) private pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @param token The address of the token that users can redeem.
     */
    function setToken(address token) external onlyOwner {
        _token = token;
    }

    /**
     * @param ecosystem The address of the ecosystem pool.
     */
    function setEcosystemPool(address ecosystem) external onlyOwner {
        _ecosystem = ecosystem;
    }

    /**
     * @param root The root hash of the dataset's merkle tree.
     */
    function setRoot(bytes32 root) external onlyOwner {
        _root = root;
    }

    /**
     * @param claims The total number of claims available in the distribution.
     */
    function setClaimsAvailable(uint256 claims) external onlyOwner {
        _claimsAvailable = claims;
    }

    /**
     * @dev Transfers all unclaimed tokens to the ecosystem pool for reallocation.
     */
    function conclude() external onlyOwner {
        
        require(_token != address(0), "Distribution: The token address has not been set");
        require(_ecosystem != address(0), "Distribution: The ecosystem pool address has not been set");

        IERC20(_token).transfer(_ecosystem, currentBalance());

    }

}