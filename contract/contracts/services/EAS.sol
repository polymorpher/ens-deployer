// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

// TODO - add an owner-verification function in DC contract
interface IDC {
    struct NameRecord {
        address renter;
        uint256 rentTime;
        uint256 expirationTime;
        uint256 lastPrice;
        string url; // this one should be pinned on top
        string prev;
        string next;
    }

    function nameRecords(bytes32 node) external view returns (NameRecord memory);
}

contract EAS is Ownable {
    // Note: `alias` is a reserved keyword in solidity, so we use aliasName instead for variable names when we meant `alias`

    struct EASConfig {
        // alias hash => commitment hash;
        // later alias can be a regex with capturing, so it should be kept hashed and remain confidential. It's also more efficient to store it this way
        mapping(bytes32 => bytes32) forwards;
        uint256 numAlias; // only a single config is supported in initial version
        string[] publicAliases; // user-configured; we do not verify.
        bytes32[] keys; // list of keys in forwards
    }

    mapping(bytes32 => EASConfig) public configs;

    bytes1 public constant SEPARATOR = bytes1("|");

    IDC public dc;
    uint256 public maxNumAlias;

    constructor(IDC _dc, uint256 _maxNumAlias) {
        dc = _dc;
        maxNumAlias = _maxNumAlias;
    }

    function getCommitment(bytes32 node, bytes32 aliasName) public view returns (bytes32){
        return configs[node].forwards[aliasName];
    }

    function getPublicAliases(bytes32 node) public view returns (string[] memory){
        return configs[node].publicAliases;
    }

    function getNumAlias(bytes32 node) public view returns (uint256){
        return configs[node].numAlias;
    }

    function setDc(IDC _dc) public onlyOwner {
        dc = _dc;
    }

    function setMaxNumAlias(uint256 _maxNumAlias) public onlyOwner {
        maxNumAlias = _maxNumAlias;
    }

    modifier onlyNodeOwner(bytes32 node){
        require(dc.nameRecords(node).renter == msg.sender, "EAS: not domain owner");
        require(dc.nameRecords(node).expirationTime > block.timestamp, "EAS: domain expired");
        _;
    }

    function activate(bytes32 node, bytes32 aliasName, bytes32 commitment) public onlyNodeOwner(node) {
        EASConfig storage ec = configs[node];
        if(ec.numAlias >= maxNumAlias && ec.forwards[aliasName] == bytes32(0)) {
            revert("EAS: exceeded maxNumAlias");
        }
        ec.numAlias += 1;
        ec.forwards[aliasName] = commitment;
        ec.keys.push(aliasName);
    }

    function deactivate(bytes32 node, bytes32 aliasName) public onlyNodeOwner(node){
        EASConfig storage ec = configs[node];
        require(ec.forwards[aliasName] != bytes32(0), "EAS: already deactivated");
        ec.numAlias -= 1;
        delete ec.forwards[aliasName];
        uint256 pos=ec.keys.length;
        for(uint256 i=0;i<ec.keys.length;i++){
            if(ec.keys[i] == aliasName){
                pos = i;
                break;
            }
        }
        ec.keys[pos] = ec.keys[ec.keys.length-1];
        ec.keys.pop();
    }

    function deactivateAll(bytes32 node) public onlyNodeOwner(node){
        EASConfig storage ec = configs[node];
        for(uint256 i=0;i<ec.keys.length;i++){
            delete ec.forwards[ec.keys[i]];
        }
        delete ec.keys;
        delete ec.publicAliases;
        ec.numAlias = 0;
    }

    function setPublicAliases(bytes32 node, string[] memory aliases) public onlyNodeOwner(node){
        configs[node].publicAliases = aliases;
    }

    function verify(bytes32 node, bytes32 msgHash, string calldata aliasName, string calldata forwardAddress, bytes calldata sig) external view {
        bytes32 commitment = configs[node].forwards[keccak256(bytes(aliasName))];
        address signer = ecrecover(msgHash, uint8(sig[65]), bytes32(sig[0:32]), bytes32(sig[32:64]));
        require(signer == dc.nameRecords(node).renter, "EAS: signature mismatch");
        bytes32 computedCommitment = keccak256(bytes.concat(bytes(aliasName), SEPARATOR, bytes(forwardAddress), SEPARATOR, sig));
        require(commitment == computedCommitment, "EAS: commitment mismatch");
    }
}