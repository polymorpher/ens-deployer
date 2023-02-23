//SPDX-License-Identifier: CC-BY-NC-4.0
import "./LengthBasedPriceOracle.sol";
import "./SimpleAssetPriceOracle.sol";

// TODO: make a better one later

contract OracleDeployer is Ownable {
    USDOracleInterface public usdOracle;
    IPriceOracle public oracle;

    constructor(uint256 _assetPriceNanoUSD, uint256 _baseUnitPrice, uint8[] memory _lengths, uint256[] memory _premiumUnitPrices) {
        SimpleAssetPriceOracle u = new SimpleAssetPriceOracle(_assetPriceNanoUSD);
        u.grantRole(u.DEFAULT_ADMIN_ROLE(), msg.sender);
        u.grantRole(u.ROLE_FEEDER(), msg.sender);
        u.renounceRole(u.ROLE_FEEDER(), address(this));
        u.renounceRole(u.DEFAULT_ADMIN_ROLE(), address(this));
        usdOracle = USDOracleInterface(address(u));
        oracle = new LengthBasedPriceOracle(usdOracle, _baseUnitPrice, _lengths, _premiumUnitPrices);
    }
}
