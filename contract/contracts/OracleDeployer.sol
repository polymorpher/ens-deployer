//SPDX-License-Identifier: CC-BY-NC-4.0
import "./LengthBasedPriceOracle.sol";
import "./SimpleAssetPriceOracle.sol";

// TODO: make a better one later

contract OracleDeployer is Ownable {
    AggregatorInterface public usdOracle;
    IPriceOracle public oracle;

    constructor(uint256 _assetPriceNanoUSD, uint256 _baseUnitPrice, uint8[] memory _lengths, uint256[] memory _premiumUnitPrices) {
        usdOracle = AggregatorInterface(address(new SimpleAssetPriceOracle(_assetPriceNanoUSD)));
        oracle = new LengthBasedPriceOracle(usdOracle, _baseUnitPrice, _lengths, _premiumUnitPrices);
    }
}
