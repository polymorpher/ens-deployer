// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity >=0.8.4;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/IBaseRegistrar.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@ensdomains/ens-contracts/contracts/wrapper/IMetadataService.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TLDBaseRegistrarImplementation is ERC721Enumerable, IBaseRegistrar, Ownable {
    bool public initialized;
    IMetadataService public metadataService;
    // A map of expiry times
    mapping(uint256 => uint256) expiries;
    // The ENS registry
    ENS public ens;
    // The namehash of the TLD this registrar owns (eg, .eth)
    bytes32 public baseNode;
    // A map of addresses that are authorised to register and renew names.
    mapping(address => bool) public controllers;
    uint256 public constant GRACE_PERIOD = 7 days;
    bytes4 private constant INTERFACE_META_ID = bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant ERC721_ID =
        bytes4(
            keccak256("balanceOf(address)") ^
                keccak256("ownerOf(uint256)") ^
                keccak256("approve(address,uint256)") ^
                keccak256("getApproved(uint256)") ^
                keccak256("setApprovalForAll(address,bool)") ^
                keccak256("isApprovedForAll(address,address)") ^
                keccak256("transferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256,bytes)")
        );
    bytes4 private constant RECLAIM_ID = bytes4(keccak256("reclaim(uint256,address)"));

    string public contractURI;
    string name_;
    string symbol_;

    function name() view public override returns (string memory){
        return name_;
    }

    function symbol() view public override returns (string memory){
        return symbol_;
    }

    function setNameSymbol(string memory _name, string memory _symbol) public onlyOwner() {
        name_ = _name;
        symbol_ = _symbol;
    }

    /**
     * v2.1.3 version of _isApprovedOrOwner which calls ownerOf(tokenId) and takes grace period into consideration instead of ERC721.ownerOf(tokenId);
     * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.1.3/contracts/token/ERC721/ERC721.sol#L187
     * @dev Returns whether the given spender can transfer a given token ID
     * @param spender address of the spender to query
     * @param tokenId uint256 ID of the token to be transferred
     * @return bool whether the msg.sender is approved for the given token ID,
     *    is an operator of the owner, or is the owner of the token
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    constructor(ENS _ens, bytes32 _baseNode, IMetadataService _metadataService) ERC721("", "") {
        ens = _ens;
        baseNode = _baseNode;
        metadataService = _metadataService;
    }

    function setContractUri(string memory _uri) public onlyOwner() {
        contractURI = _uri;
    }

    modifier live() {
        require(ens.owner(baseNode) == address(this));
        _;
    }

    modifier onlyController() {
        require(controllers[msg.sender]);
        _;
    }

    function initialize(uint256[] calldata _ids, address[] calldata _owners, uint256[] calldata _expiries, bool updateRegistry) external onlyOwner {
        require(!initialized, "BR: already initialized");
        require(_ids.length == _owners.length && _expiries.length == _owners.length, "BR: unequal length");
        for (uint256 i = 0; i < _ids.length; i++) {
            expiries[_ids[i]] = _expiries[i];
            if (_exists(_ids[i])) {
                // Name was previously owned, and expired
                _burn(_ids[i]);
            }
            _mint(_owners[i], _ids[i]);
            if (updateRegistry) {
                ens.setSubnodeOwner(baseNode, bytes32(_ids[i]), _owners[i]);
            }
        }
    }

    function finishInitialization() external onlyOwner {
        initialized = true;
    }

    /**
     * @dev Gets the owner of the specified token ID. Names become unowned
     *      when their registration expires.
     * @param tokenId uint256 ID of the token to query the owner of
     * @return address currently marked as the owner of the given token ID
     */
    function ownerOf(uint256 tokenId) public view override(IERC721, ERC721) returns (address) {
        require(expiries[tokenId] > block.timestamp);
        return super.ownerOf(tokenId);
    }

    // Authorises a controller, who can register and renew domains.
    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    // Revoke controller permission for an address.
    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    // Set the resolver for the TLD this registrar manages.
    function setResolver(address resolver) external override onlyOwner {
        ens.setResolver(baseNode, resolver);
    }

    // Returns the expiration timestamp of the specified id.
    function nameExpires(uint256 id) external view override returns (uint256) {
        return expiries[id];
    }

    // Returns true iff the specified name is available for registration.
    function available(uint256 id) public view override returns (bool) {
        // Not available if it's registered here or in its grace period.
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    /* Metadata service */

    /**
     * @notice Set the metadata service. Only the owner can do this
     * @param _metadataService The new metadata service
     */

    function setMetadataService(IMetadataService _metadataService) public onlyOwner {
        metadataService = _metadataService;
    }

    /**
     * @notice Get the metadata uri
     * @param tokenId The id of the token
     * @return string uri of the metadata service
     */

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return metadataService.uri(tokenId);
    }

    /**
     * @dev Register a name.
     * @param id The token ID (keccak256 of the label).
     * @param owner The address that should own the registration.
     * @param duration Duration in seconds for the registration.
     */
    function register(uint256 id, address owner, uint256 duration) external override returns (uint256) {
        return _register(id, owner, duration, true);
    }

    /**
     * @dev Register a name, without modifying the registry.
     * @param id The token ID (keccak256 of the label).
     * @param owner The address that should own the registration.
     * @param duration Duration in seconds for the registration.
     */
    function registerOnly(uint256 id, address owner, uint256 duration) external returns (uint256) {
        return _register(id, owner, duration, false);
    }

    function _register(uint256 id, address owner, uint256 duration, bool updateRegistry) internal live onlyController returns (uint256) {
        require(available(id));
        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD);
        // Prevent future overflow

        expiries[id] = block.timestamp + duration;
        if (_exists(id)) {
            // Name was previously owned, and expired
            _burn(id);
        }
        _mint(owner, id);
        if (updateRegistry) {
            ens.setSubnodeOwner(baseNode, bytes32(id), owner);
        }

        emit NameRegistered(id, owner, block.timestamp + duration);

        return block.timestamp + duration;
    }

    function renew(uint256 id, uint256 duration) external override live onlyController returns (uint256) {
        require(expiries[id] + GRACE_PERIOD >= block.timestamp);
        // Name must be registered here or in grace period
        require(expiries[id] + duration + GRACE_PERIOD > duration + GRACE_PERIOD);
        // Prevent future overflow

        expiries[id] += duration;
        emit NameRenewed(id, expiries[id]);
        return expiries[id];
    }

    /**
     * @dev Reclaim ownership of a name in ENS, if you own it in the registrar.
     */
    function reclaim(uint256 id, address owner) external override live {
        require(_isApprovedOrOwner(msg.sender, id));
        ens.setSubnodeOwner(baseNode, bytes32(id), owner);
    }

    function supportsInterface(bytes4 interfaceID) public view override(IERC165, ERC721Enumerable) returns (bool) {
        return interfaceID == INTERFACE_META_ID || interfaceID == ERC721_ID || interfaceID == RECLAIM_ID || ERC721Enumerable.supportsInterface(interfaceID);
    }
}
