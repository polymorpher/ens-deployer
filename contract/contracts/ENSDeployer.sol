// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity >=0.8.4;

import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol";
import "./TLDMetadataService.sol";
import "./TLDNameWrapper.sol";
import "./TLDBaseRegistrarImplementation.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/IBaseRegistrar.sol";
import {INameWrapper as INameWrapperForPublicResolver, PublicResolver} from "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";
import "@ensdomains/ens-contracts/contracts/utils/UniversalResolver.sol";
import {NameResolver, ReverseRegistrar} from "@ensdomains/ens-contracts/contracts/registry/ReverseRegistrar.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RegistrarController.sol";

library ENSUtils {
    bytes32 public constant RESOLVER_LABEL = keccak256("resolver");
    bytes32 public constant REVERSE_REGISTRAR_LABEL = keccak256("reverse");
    bytes32 public constant ADDR_LABEL = keccak256("addr");

    function namehash(bytes32 node, bytes32 label) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, label));
    }

    function namehash(bytes32 label) public pure returns (bytes32) {
        return namehash(bytes32(0), label);
    }
}

library ENSRegistryDeployer {
    function deployRegistryRegistrar(
        string memory tld
    ) public returns (ENSRegistry ens, FIFSRegistrar fifsRegistrar, ReverseRegistrar reverseRegistrar, TLDBaseRegistrarImplementation baseRegistrar) {
        bytes32 tld_label = keccak256(bytes(tld));
        ens = new ENSRegistry();

        // Create a FIFS registrar for the TLD
        fifsRegistrar = new FIFSRegistrar(ens, ENSUtils.namehash(tld_label));

        ens.setSubnodeOwner(bytes32(0), tld_label, address(fifsRegistrar));

        // Construct a new reverse registrar and point it at the public resolver
        reverseRegistrar = new ReverseRegistrar(ens);

        // Set up the reverse registrar
        ens.setSubnodeOwner(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL, address(this));
        ens.setSubnodeOwner(ENSUtils.namehash(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL), ENSUtils.ADDR_LABEL, address(reverseRegistrar));

        IMetadataService metadataService = IMetadataService(address(new TLDMetadataService("https://1ns-metadata.hiddenstate.xyz/erc721")));
        baseRegistrar = new TLDBaseRegistrarImplementation(ens, ENSUtils.namehash(tld_label), metadataService);
        ens.setSubnodeOwner(bytes32(0), tld_label, address(this));
    }
}

library ENSNFTDeployer {
    function deployNFTServices(
        ENS ens,
        TLDBaseRegistrarImplementation baseRegistrar,
        string memory tld
    ) public returns (IMetadataService metadataService, TLDNameWrapper nameWrapper) {
        metadataService = IMetadataService(address(new TLDMetadataService("https://1ns-metadata.hiddenstate.xyz/erc1155")));
        nameWrapper = new TLDNameWrapper(ens, baseRegistrar, metadataService, tld);
    }
}

library ENSControllerDeployer {
    function deployController(
        string memory tld,
        IPriceOracle priceOracle,
        TLDNameWrapper nameWrapper,
        TLDBaseRegistrarImplementation baseRegistrar,
        ReverseRegistrar reverseRegistrar,
        address revenueAccount
    ) public returns (RegistrarController registrarController) {
        registrarController = new RegistrarController(
            baseRegistrar,
            priceOracle,
            0,
            60 * 2,
            reverseRegistrar,
            nameWrapper,
            ENSUtils.namehash(keccak256(bytes(tld))),
            tld,
            revenueAccount
        );
    }
}

library ENSPublicResolverDeployer {
    function deployResolver(
        string memory tld,
        ENS ens,
        TLDNameWrapper nameWrapper,
        RegistrarController registrarController,
        ReverseRegistrar reverseRegistrar
    ) public returns (PublicResolver publicResolver) {
        // Create the public resolver and set it as the resolver for both root and country nodes (we use country)
        publicResolver = new PublicResolver(ens, INameWrapperForPublicResolver(address(nameWrapper)), address(registrarController), address(reverseRegistrar));
        // Older version of deploy script sets the resolver at the root level
        // reference https://docs.ens.domains/deploying-ens-on-a-private-chain#deploying-ens-in-a-single-transaction
        // bytes32 resolverNode = ENSUtils.namehash(ENSUtils.RESOLVER_LABEL);
        bytes32 rootResolverNode = ENSUtils.namehash(ENSUtils.RESOLVER_LABEL);
        ens.setSubnodeOwner(bytes32(0), ENSUtils.RESOLVER_LABEL, address(this));
        ens.setResolver(rootResolverNode, address(publicResolver));

        // Newer version sets the resolver node at the TLD level
        // reference https://github.com/ensdomains/ens-contracts/blob/master/deploy/resolvers/00_deploy_public_resolver.ts#L34
        bytes32 tldNode = ENSUtils.namehash(keccak256(abi.encodePacked(tld)));
        bytes32 resolverNode = ENSUtils.namehash(tldNode, ENSUtils.RESOLVER_LABEL);
        ens.setSubnodeOwner(tldNode, ENSUtils.RESOLVER_LABEL, address(this));

        ens.setResolver(tldNode, address(publicResolver));
        ens.setResolver(resolverNode, address(publicResolver));
        publicResolver.setAddr(resolverNode, address(publicResolver));
    }
}

// Construct a set of test ENS contracts.
contract ENSDeployer is Ownable {

    ENSRegistry public ens;
    FIFSRegistrar public fifsRegistrar;
    ReverseRegistrar public reverseRegistrar;
    TLDBaseRegistrarImplementation public baseRegistrar;
    IMetadataService public metadataService;
    TLDNameWrapper public nameWrapper;
    RegistrarController public registrarController;
    PublicResolver public publicResolver;
    UniversalResolver public universalResolver;

    function deployResolver(string memory tld) public onlyOwner {
        bytes32 tld_label = keccak256(bytes(tld));
        bytes32 tld_node = ENSUtils.namehash(tld_label);
        publicResolver = ENSPublicResolverDeployer.deployResolver(tld, ens, nameWrapper, registrarController, reverseRegistrar);
        reverseRegistrar.setDefaultResolver(address(publicResolver));

        // get from scripts/computeInterfaceId.ts for  TLDNameWrapper
        publicResolver.setInterface(tld_node, 0x995c8123, address(nameWrapper));
        // get from scripts/computeInterfaceId.ts for RegistrarController
        publicResolver.setInterface(tld_node, 0xdf7ed181, address(registrarController));
    }

    function deployUtils() public onlyOwner {
        universalResolver = new UniversalResolver(address(ens), new string[](0));
    }

    function deployRegistryRegistrar(string memory tld) public onlyOwner {
        (ens, fifsRegistrar, reverseRegistrar, baseRegistrar) = ENSRegistryDeployer.deployRegistryRegistrar(tld);
    }

    function deployNFTServices(string memory tld) public onlyOwner {
        (metadataService, nameWrapper) = ENSNFTDeployer.deployNFTServices(ens, baseRegistrar, tld);
        baseRegistrar.addController(address(nameWrapper));
    }

    function deployController(string memory tld, IPriceOracle priceOracle, address revenueAccount) public onlyOwner {
        registrarController = ENSControllerDeployer.deployController(tld, priceOracle, nameWrapper, baseRegistrar, reverseRegistrar, revenueAccount);
        nameWrapper.setController(address(registrarController), true);
        reverseRegistrar.setController(address(registrarController), true);
    }

    function setOwnership(string memory tld) public onlyOwner {
        bytes32 tld_label = keccak256(bytes(tld));
        ens.setSubnodeOwner(bytes32(0), tld_label, address(baseRegistrar));
    }

    constructor(address _ownerAccount) {
        transferOwnership(_ownerAccount);
    }

    function deploy(IPriceOracle _priceOracle, address _revenueAccount, string memory _tld) public onlyOwner{
        deployRegistryRegistrar(_tld);
        deployNFTServices(_tld);
        deployController(_tld, _priceOracle, _revenueAccount);
        deployResolver(_tld);
        deployUtils();
        setOwnership(_tld);
    }

    function transferOwner(address dest) external onlyOwner {
        ens.setSubnodeOwner(bytes32(0), ENSUtils.REVERSE_REGISTRAR_LABEL, dest);
        ens.setSubnodeOwner(bytes32(0), ENSUtils.RESOLVER_LABEL, dest);
        ens.setOwner(bytes32(0), dest);
        nameWrapper.transferOwnership(dest);
        baseRegistrar.transferOwnership(dest);
        universalResolver.transferOwnership(dest);
        reverseRegistrar.transferOwnership(dest);
        registrarController.transferOwnership(dest);
    }

    // @polymorpher (Feb 1, 2023): added in case we have some money stuck in this contract due to misconfiguration
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    // @polymorpher (Feb 1, 2023): added in case some deployed contract is misconfigured to allow call from this contract only (e.g. as owner)
    function call(address dest, uint256 value, bytes memory data) external onlyOwner {
        (bool success, ) = dest.call{value: value}(data);
        require(success, "call failed");
    }
}
