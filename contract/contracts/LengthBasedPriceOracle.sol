// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity ~0.8.17;

import "@ensdomains/ens-contracts/contracts/ethregistrar/IPriceOracle.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
}

contract LengthBasedPriceOracle is IPriceOracle {
    using StringUtils for *;

    uint256 public constant PRECISION = 1e9;
    // A unit is a second. Price is measured in the number of nanoUSD, i.e. 1 / PRECISION USD (or, 1e-9). Example: if length 1 domains should be priced at 100 USD per second (i.e. 3.15360 billion USD per year), the key would be 1, corresponding value would be 100 * 1e+9 = 1e+11
    mapping(uint8 => uint256) public premiumUnitPrice;
    uint256 public baseUnitPrice;

    // We assume the price oracle will answer with the USD price per unit of native asset (e.g. ONE) multiplied by PRECISION (1e+9). Example: if price of ONE is 0.02, then the answer should be 0.02 * 1e+9 = 2e+7
    AggregatorInterface public immutable usdOracle;

    event PremiumPriceChanged(uint8 length, uint256 oldPrice, uint256 newPrice);
    event BasePriceChanged(uint256 oldPrice, uint256 newPrice);

    constructor(AggregatorInterface _usdOracle, uint256 _baseUnitPrice, uint8[] memory _lengths, uint256[] memory _premiumUnitPrices) {
        usdOracle = _usdOracle;
        for (uint8 i = 0; i < _lengths.length; i++) {
            premiumUnitPrice[_lengths[i]] = _premiumUnitPrices[i];
        }
        baseUnitPrice = _baseUnitPrice;
    }

    // returned value is in wei
    function price(string calldata name, uint256 expires, uint256 duration) external view override returns (IPriceOracle.Price memory) {
        uint256 base = baseUnitPrice * duration;
        return IPriceOracle.Price({base: nanoUsdToWei(base), premium: nanoUsdToWei(premium(name, expires, duration))});
    }

    /**
     * @dev Returns the pricing premium in wei.
     */
    function premium(string calldata name, uint256 expires, uint256 duration) public view returns (uint256) {
        uint8 len = uint8(name.strlen());
        return premiumUnitPrice[len] * duration;
    }

    // input is in nanoUSD, output is in wei
    function nanoUsdToWei(uint256 amount) public view returns (uint256) {
        uint256 nativeTokenPrice = uint256(usdOracle.latestAnswer());
        return (amount * 1e18) / nativeTokenPrice;
    }

    function weiToNanoUsd(uint256 amountWei) public view returns (uint256) {
        uint256 nativeTokenPrice = uint256(usdOracle.latestAnswer());
        return (amountWei * nativeTokenPrice) / 1e18;
    }

    function supportsInterface(bytes4 interfaceID) public view virtual returns (bool) {
        return interfaceID == type(IERC165).interfaceId || interfaceID == type(IPriceOracle).interfaceId;
    }
}
