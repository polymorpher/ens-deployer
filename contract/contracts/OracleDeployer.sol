import "@ensdomains/ens-contracts/contracts/ethregistrar/StablePriceOracle.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/DummyOracle.sol";

// TODO: make a real one later
contract OracleDeployer is Ownable {
    AggregatorInterface public usdOracle;
    IPriceOracle public oracle;

    constructor(int256 tokenPriceUSD, uint256[] memory rents) {
        usdOracle = AggregatorInterface(address(new DummyOracle(tokenPriceUSD)));
        oracle = new StablePriceOracle(usdOracle, rents);
    }
}
