pragma solidity >=0.8.4;

import '@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol';
import '@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol';
import '@ensdomains/ens-contracts/contracts/wrapper/StaticMetadataService.sol';
import '@ensdomains/ens-contracts/contracts/wrapper/NameWrapper.sol';
import '@ensdomains/ens-contracts/contracts/ethregistrar/BaseRegistrarImplementation.sol';
import '@ensdomains/ens-contracts/contracts/ethregistrar/IBaseRegistrar.sol';
import {INameWrapper as INameWrapperForPublicResolver, PublicResolver} from '@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol';
import '@ensdomains/ens-contracts/contracts/utils/UniversalResolver.sol';
import {NameResolver, ReverseRegistrar} from '@ensdomains/ens-contracts/contracts/registry/ReverseRegistrar.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RegistrarController.sol";

// Construct a set of test ENS contracts.
contract ENSDeployer is Ownable {
    bytes32 public constant RESOLVER_LABEL = keccak256('resolver');
    bytes32 public constant REVERSE_REGISTRAR_LABEL = keccak256('reverse');
    bytes32 public constant ADDR_LABEL = keccak256('addr');

    // core
    ENSRegistry public ens;
    FIFSRegistrar public fifsRegistrar;
    ReverseRegistrar public reverseRegistrar;
    PublicResolver public publicResolver;
    BaseRegistrarImplementation public baseRegistrar;
    UniversalResolver public universalResolver;

    // nft
    IMetadataService public metadataService; // this needs to be replaced with something real
    INameWrapper public nameWrapper;

    RegistrarController public registrarController;

    function namehash(bytes32 node, bytes32 label) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, label));
    }

    function namehash(bytes32 label) public pure returns (bytes32){
        return namehash(bytes32(0), label);
    }

    function deployRegistry(string memory tld) public onlyOwner {
        bytes32 tld_label = keccak256(bytes(tld));
        ens = new ENSRegistry();

        // Create a FIFS registrar for the TLD
        fifsRegistrar = new FIFSRegistrar(ens, namehash(tld_label));

        ens.setSubnodeOwner(bytes32(0), tld_label, address(fifsRegistrar));

        // Construct a new reverse registrar and point it at the public resolver
        reverseRegistrar = new ReverseRegistrar(ens);

        // Set up the reverse registrar
        ens.setSubnodeOwner(bytes32(0), REVERSE_REGISTRAR_LABEL, address(this));
        ens.setSubnodeOwner(
            namehash(bytes32(0), REVERSE_REGISTRAR_LABEL),
            ADDR_LABEL,
            address(reverseRegistrar)
        );

        baseRegistrar = new BaseRegistrarImplementation(ens, namehash(tld_label));
    }

    function deployNFTServices() public onlyOwner{
        metadataService = IMetadataService(address(new StaticMetadataService("https://modulo.so/ens/metadata")));
        nameWrapper = new NameWrapper(ens, baseRegistrar, metadataService);
    }

    function deployResolver() public onlyOwner{
        publicResolver = new PublicResolver(
            ens,
            INameWrapperForPublicResolver(address(nameWrapper)),
            address(registrarController),
            address(reverseRegistrar)
        );
        bytes32 resolverNode = namehash(RESOLVER_LABEL);
        ens.setSubnodeOwner(bytes32(0), RESOLVER_LABEL, address(this));
        ens.setResolver(resolverNode, address(publicResolver));
        publicResolver.setAddr(resolverNode, address(publicResolver));
    }

    function deployUtils() public onlyOwner{
        universalResolver = new UniversalResolver(address(ens), new string[](0));
    }

    function deployController(string memory tld, IPriceOracle priceOracle) public onlyOwner{
        registrarController = new RegistrarController(
            baseRegistrar,
            priceOracle,
            3600 * 24 * 365,
            3600 * 24 * 365 * 10,
            reverseRegistrar,
            nameWrapper,
            namehash(keccak256(bytes(tld))),
            tld
        );
    }

    constructor(string memory tld, IPriceOracle priceOracle) {
        deployRegistry(tld);
        deployNFTServices();
        deployController(tld, priceOracle);
        deployResolver();
        deployUtils();
    }

    function transferOwner(address dest) external onlyOwner {
        ens.setSubnodeOwner(bytes32(0), REVERSE_REGISTRAR_LABEL, dest);
        ens.setSubnodeOwner(bytes32(0), RESOLVER_LABEL, dest);
        ens.setOwner(bytes32(0), dest);
    }
}