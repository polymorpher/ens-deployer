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

library ENSUtils{
    bytes32 public constant RESOLVER_LABEL = keccak256('resolver');
    bytes32 public constant REVERSE_REGISTRAR_LABEL = keccak256('reverse');
    bytes32 public constant ADDR_LABEL = keccak256('addr');

    function namehash(bytes32 node, bytes32 label) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, label));
    }
    function namehash(bytes32 label) public pure returns (bytes32){
        return namehash(bytes32(0), label);
    }
}

library ENSRegistryDeployer{
    function deployRegistry(string memory tld) public returns (
        ENSRegistry ens,
        FIFSRegistrar fifsRegistrar,
        ReverseRegistrar reverseRegistrar,
        BaseRegistrarImplementation baseRegistrar
    ){
        bytes32 tld_label = keccak256(bytes(tld));
        ens = new ENSRegistry();

        // Create a FIFS registrar for the TLD
        fifsRegistrar = new FIFSRegistrar(ens, ENSUtils.namehash(tld_label));

        ens.setSubnodeOwner(bytes32(0), tld_label, address(fifsRegistrar));

        // Construct a new reverse registrar and point it at the public resolver
        reverseRegistrar = new ReverseRegistrar(ens);

        // Set up the reverse registrar
        ens.setSubnodeOwner(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL, address(this));
        ens.setSubnodeOwner(
            ENSUtils.namehash(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL),
            ENSUtils.ADDR_LABEL,
            address(reverseRegistrar)
        );

        baseRegistrar = new BaseRegistrarImplementation(ens, ENSUtils.namehash(tld_label));
    }
}

library ENSNFTDeployer{
    function deployNFTServices(ENS ens, BaseRegistrarImplementation baseRegistrar) public returns (IMetadataService metadataService, INameWrapper nameWrapper){
        metadataService = IMetadataService(address(new StaticMetadataService("https://modulo.so/ens/metadata")));
        nameWrapper = new NameWrapper(ens, baseRegistrar, metadataService);
    }
}

library ENSControllerDeployer{
    function deployController(string memory tld, IPriceOracle priceOracle, INameWrapper nameWrapper, BaseRegistrarImplementation baseRegistrar, ReverseRegistrar reverseRegistrar) public returns (RegistrarController registrarController) {
        registrarController = new RegistrarController(
            baseRegistrar,
            priceOracle,
            3600 * 24 * 365,
            3600 * 24 * 365 * 10,
            reverseRegistrar,
            nameWrapper,
            ENSUtils.namehash(keccak256(bytes(tld))),
            tld
        );
    }
}

library ENSPublicResolverDeployer{
    function deployResolver(ENS ens, INameWrapper nameWrapper, RegistrarController registrarController, ReverseRegistrar reverseRegistrar) public returns(PublicResolver publicResolver){
        publicResolver = new PublicResolver(
            ens,
            INameWrapperForPublicResolver(address(nameWrapper)),
            address(registrarController),
            address(reverseRegistrar)
        );
        bytes32 resolverNode = ENSUtils.namehash(ENSUtils.RESOLVER_LABEL);
        ens.setSubnodeOwner(bytes32(0), ENSUtils.RESOLVER_LABEL, address(this));
        ens.setResolver(resolverNode, address(publicResolver));
        publicResolver.setAddr(resolverNode, address(publicResolver));
    }
}

// Construct a set of test ENS contracts.
contract ENSDeployer is Ownable {
    // core
    ENSRegistry public ens;
    FIFSRegistrar public fifsRegistrar;
    ReverseRegistrar public reverseRegistrar;
    BaseRegistrarImplementation public baseRegistrar;
    // nft
    IMetadataService public metadataService; // this needs to be replaced with something real
    INameWrapper public nameWrapper;

    RegistrarController public registrarController;

    PublicResolver public publicResolver;

    UniversalResolver public universalResolver;

    function deployResolver() public onlyOwner{
        publicResolver = ENSPublicResolverDeployer.deployResolver(ens, nameWrapper, registrarController, reverseRegistrar);
    }

    function deployUtils() public onlyOwner{
        universalResolver = new UniversalResolver(address(ens), new string[](0));
    }

    function deployRegistrar(string memory tld) public onlyOwner {
        (ens, fifsRegistrar, reverseRegistrar, baseRegistrar) = ENSRegistryDeployer.deployRegistry(tld);
    }
    function deployNFTServices() public onlyOwner {
        (metadataService, nameWrapper) = ENSNFTDeployer.deployNFTServices(ens, baseRegistrar);
    }
    function deployController(string memory tld, IPriceOracle priceOracle) public onlyOwner{
        registrarController = ENSControllerDeployer.deployController(tld, priceOracle, nameWrapper, baseRegistrar, reverseRegistrar);
    }

    constructor(string memory tld, IPriceOracle priceOracle) {
        deployRegistrar(tld);
        deployNFTServices();
        deployController(tld, priceOracle);
        deployResolver();
        deployUtils();
    }

    function transferOwner(address dest) external onlyOwner {
        ens.setSubnodeOwner(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL, dest);
        ens.setSubnodeOwner(bytes32(0), ENSUtils.RESOLVER_LABEL, dest);
        ens.setOwner(bytes32(0), dest);
    }
}