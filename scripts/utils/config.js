/**
 * Shared configuration for all test scripts
 */

const { ethers } = require("ethers");

// Load environment variables from root .env file
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Network configuration - all from environment
// Using USER_HUB as the MarketplaceHub address
const NETWORK_CONFIG = {
  local: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_LOCAL || "http://127.0.0.1:8545",
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_LOCAL, // USER_HUB acts as MarketplaceHub
    chainId: 31337,
  },
  sepolia: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA,
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_SEPOLIA,
    chainId: 11155111,
  },
  mainnet: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
    hubAddress: process.env.NEXT_PUBLIC_USER_HUB_MAINNET,
    chainId: 1,
  },
};

// Validate configuration
function validateConfig(network) {
  const config = NETWORK_CONFIG[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  if (!config.hubAddress) {
    throw new Error(
      `Hub address not configured for ${network}. Please set NEXT_PUBLIC_USER_HUB_${network.toUpperCase()} in .env`
    );
  }
  if (!config.rpcUrl) {
    throw new Error(
      `RPC URL not configured for ${network}. Please set NEXT_PUBLIC_RPC_URL_${network.toUpperCase()} in .env`
    );
  }
  return config;
}

// Default network
const DEFAULT_NETWORK = "local";

// ABIs
const FACTORY_ERC721_ABI = require("../../src/lib/contracts/abis/ERC721CollectionFactory.json");
const FACTORY_ERC1155_ABI = require("../../src/lib/contracts/abis/ERC1155CollectionFactory.json");
const HUB_ABI = require("../../src/lib/contracts/abis/UserHub.json");

// Collection ABIs
const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to, uint256 tokenId) external",
  "function mintBatch(address to, uint256[] calldata tokenIds) external",
  "function safeMint(address to, string memory uri) external returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function approve(address to, uint256 tokenId) external",
  "function addToAllowlist(address[] calldata addresses) external",
  "function removeFromAllowlist(address[] calldata addresses) external",
];

const ERC1155_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mint(address to, uint256 id, uint256 amount, bytes data) external",
  "function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function addToAllowlist(address[] calldata addresses) external",
  "function removeFromAllowlist(address[] calldata addresses) external",
];

/**
 * Get provider and signer for specified network
 */
async function getProviderAndSigner(network = DEFAULT_NETWORK) {
  // Validate and get config
  const config = validateConfig(network);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Get first account (usually the deployer)
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Make sure the network is running.");
  }

  const signer = await provider.getSigner(0);
  const account = await signer.getAddress();

  console.log(`📡 Connected to ${network} network`);
  console.log(`👤 Using account: ${account}`);

  const balance = await provider.getBalance(account);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  return { provider, signer, account, config };
}

/**
 * Get provider for the specified network
 */
async function getProvider(network = DEFAULT_NETWORK) {
  const { provider } = await getProviderAndSigner(network);
  return provider;
}

/**
 * Get signer for the specified network
 */
async function getSigner(network = DEFAULT_NETWORK) {
  const { signer } = await getProviderAndSigner(network);
  return signer;
}

/**
 * Get marketplace hub contract
 */
async function getMarketplaceHub(network = DEFAULT_NETWORK) {
  const { signer, config } = await getProviderAndSigner(network);
  const addresses = await getContractAddresses(signer, config.hubAddress);
  return { signer, addresses, config };
}

/**
 * Get contract addresses from deployment file
 */
async function getContractAddresses(signer, hubAddress) {
  // Read deployment file to get actual contract addresses
  const fs = require("fs");
  const path = require("path");

  try {
    const deploymentPath = path.resolve(
      __dirname,
      "../../../zuno-marketplace-contracts/broadcast/DeployAll.s.sol/31337/run-latest.json"
    );
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const contracts = {};
    deployment.transactions.forEach((tx) => {
      if (tx.contractName && tx.contractAddress) {
        contracts[tx.contractName] = tx.contractAddress;
      }
    });

    return {
      erc721Factory: contracts.ERC721CollectionFactory,
      erc1155Factory: contracts.ERC1155CollectionFactory,
      erc721Exchange: contracts.ERC721NFTExchange,
      erc1155Exchange: contracts.ERC1155NFTExchange,
      englishAuction: contracts.EnglishAuction || contracts.AuctionFactory, // Fallback to factory
      dutchAuction: contracts.DutchAuction || contracts.AuctionFactory, // Fallback to factory
      auctionFactory: contracts.AuctionFactory,
      feeRegistry: contracts.FeeRegistry,
      bundleManager: contracts.BundleManager,
      offerManager: contracts.OfferManager,
      listingHistoryTracker: contracts.ListingHistoryTracker,
    };
  } catch (error) {
    console.error("Error reading deployment file:", error.message);
    throw new Error("Could not read contract addresses from deployment file");
  }
}

/**
 * Format collection parameters for both ERC721 and ERC1155
 */
function formatCollectionParams(params, owner) {
  return {
    name: params.name || "Test Collection",
    symbol: params.symbol || "TEST",
    owner: params.owner || owner,
    description: params.description || "A test collection",
    mintPrice: params.mintPrice
      ? ethers.parseEther(params.mintPrice.toString())
      : ethers.parseEther("0.01"),
    royaltyFee: params.royaltyFee || 500, // 5% default
    maxSupply: params.maxSupply || 10000,
    mintLimitPerWallet: params.mintLimitPerWallet || 10,
    mintStartTime: params.mintStartTime || 0,
    allowlistMintPrice: params.allowlistMintPrice
      ? ethers.parseEther(params.allowlistMintPrice.toString())
      : ethers.parseEther("0.008"),
    publicMintPrice: params.publicMintPrice
      ? ethers.parseEther(params.publicMintPrice.toString())
      : ethers.parseEther("0.01"),
    allowlistStageDuration: params.allowlistStageDuration || 86400, // 1 day
    tokenURI:
      params.tokenURI || params.baseURI || "https://api.example.com/metadata/",
  };
}

/**
 * Wait for transaction and log result
 */
async function waitForTransaction(tx, description = "Transaction") {
  console.log(`\n📤 ${description} sent`);
  console.log(`   Hash: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);

  const receipt = await tx.wait();
  console.log(`✅ ${description} confirmed in block ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

  return receipt;
}

module.exports = {
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  FACTORY_ERC721_ABI,
  FACTORY_ERC1155_ABI,
  HUB_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  getProviderAndSigner,
  getProvider,
  getSigner,
  getMarketplaceHub,
  getContractAddresses,
  formatCollectionParams,
  waitForTransaction,
};
