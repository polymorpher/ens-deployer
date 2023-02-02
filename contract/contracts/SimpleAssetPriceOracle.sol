// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract SimpleAssetPriceOracle is AccessControl {
    uint256 public constant PRECISION = 1e9;
    bytes32 public constant ROLE_FEEDER = keccak256("ROLE_FEEDER");
    uint256 value;

    constructor(uint256 _value) public {
        _setupRole(ROLE_FEEDER, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        set(_value);
    }

    function set(uint256 _value) public onlyRole(ROLE_FEEDER) {
        value = _value;
    }

    function latestAnswer() public view returns (uint256) {
        return value;
    }
}
