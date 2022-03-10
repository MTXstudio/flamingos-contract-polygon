// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';

contract PinkFlamingoSocialClubPassport is ERC721Enumerable {
  /**
  @dev events
 */
  event Mint(address indexed _to, uint256 indexed _tokenId);
  event Migration(address indexed _to, uint256 indexed _tokenId);

  /**
  @dev global
 */
  address public admin;
  uint256 public nextTokenId;
  uint256 public maxTokenId;
  uint256 public tokenPriceInWei;
  string public baseURI;
  bool public isMintPaused = true;
  mapping(address => uint) addressToMintCount;
  /**
  @dev minters store
 */
  mapping(address => bool) addressToHasRedeemLeft;

  /**
  @dev constructor
 */

  constructor(
    string memory _tokenName,
    string memory _tokenSymbol,
    uint256 _maxTokenId,
    uint256 _tokenPriceInWei,
    uint256 _nextTokenId,
    address[] memory _minters
  ) ERC721(_tokenName, _tokenSymbol) {
    admin = msg.sender;
    maxTokenId = _maxTokenId;
    nextTokenId = _nextTokenId;
    tokenPriceInWei = _tokenPriceInWei;
    loadMinters(_minters);
  }

  /**
  @dev modifiers
 */

  modifier onlyValidTokenId(uint256 _tokenId) {
    require(_exists(_tokenId), 'Token ID does not exist Yet');
    _;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'Only admin');
    _;
  }

  /**
  @dev helpers 
 */

  function loadMinters(address[] memory _minters) public onlyAdmin {
    for (uint256 i = 0; i < _minters.length; i++) {
      addressToHasRedeemLeft[_minters[i]] = true;
    }
  }

  function _splitFunds(uint _amount) internal {
    if (msg.value > 0) {
      uint256 refund = msg.value - tokenPriceInWei * _amount;
      if (refund > 0) {
        payable(msg.sender).transfer(refund);
      }
      payable(admin).transfer(tokenPriceInWei * _amount);
    }
  }

  function pauseMint() public onlyAdmin {
    isMintPaused = !isMintPaused;
  }

  function addBaseURI(string memory _newBaseURI) public onlyAdmin {
    baseURI = _newBaseURI;
  }

  function contractURI() public pure returns (string memory) {
    return
      string(
        'https://algobits.mypinata.cloud/ipfs/QmQFepGqKVKgEcpyEbVuXuNMeS6pG4PyUbWwiY8aDmLDpz'
      );
  }

  function tokenURI(uint256 _tokenId)
    public
    view
    override
    onlyValidTokenId(_tokenId)
    returns (string memory)
  {
    return string(abi.encodePacked(baseURI, '/nfts/', Strings.toString(_tokenId)));
  }

  /**
  @dev Mint Functions
 */

  function _mintToken(address _to) internal returns (uint256 _tokenId) {
    uint256 tokenIdToBe = nextTokenId;
    nextTokenId += 1;
    _mint(_to, tokenIdToBe);
    emit Mint(_to, tokenIdToBe);
    return tokenIdToBe;
  }

  function mintPassport(uint256 _amount) public payable {
    require(nextTokenId <= maxTokenId, 'Must not exceed maximum mint on Fantom');
    require(!isMintPaused || msg.sender == admin, 'Purchases must not be paused');
    require(_amount * tokenPriceInWei == msg.value);
    require(addressToMintCount[msg.sender] + _amount <= 10);
    addressToMintCount[msg.sender] += _amount;
    for (uint i = 0; i < _amount; i++) {
        _mintToken(msg.sender);
    }
    payable(admin).transfer(msg.value);
  }

  function isEligableToRedeem(address _address) external view returns (bool isElligable) {
    return addressToHasRedeemLeft[_address];
  }

  function redeemPassport(address _to) public returns (uint256 _tokenId) {
    require(nextTokenId <= maxTokenId, 'Must not exceed maximum mint on Fantom');
    require(!isMintPaused || msg.sender == admin, 'Purchases must not be paused');
    require(
      addressToHasRedeemLeft[msg.sender],
      'Address not in Whitelist or Has Already Redeemed'
    );
    addressToHasRedeemLeft[msg.sender] = false;
    uint256 tokenId = _mintToken(_to);
    return tokenId;
  }
}
