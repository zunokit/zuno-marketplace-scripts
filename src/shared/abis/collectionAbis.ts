/**
 * Minimal ABIs for dynamically deployed collection contracts
 * These ABIs are not available in the API because collections are deployed by factories
 */

/**
 * Minimal ERC721 Collection ABI
 * Based on ERC721Collection.sol in zuno-marketplace-contracts
 */
export const ERC721_COLLECTION_ABI = [
  // ERC721 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',

  // Ownable
  'function owner() view returns (address)',

  // BaseCollection
  'function s_description() view returns (string)',
  'function s_mintPrice() view returns (uint256)',
  'function s_maxSupply() view returns (uint256)',
  'function s_mintLimitPerWallet() view returns (uint256)',
  'function s_totalMinted() view returns (uint256)',
  'function s_currentStage() view returns (uint8)',
  'function s_mintedPerWallet(address) view returns (uint256)',

  // Getter functions (if implemented)
  'function getMintPrice() view returns (uint256)',
  'function getMaxSupply() view returns (uint256)',
  'function getTotalMinted() view returns (uint256)',
  'function getCurrentStage() view returns (uint8)',

  // Minting functions
  'function mint(address to) payable',
  'function batchMintERC721(address to, uint256 amount) payable',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Minted(address indexed to, uint256 indexed tokenId, uint256 amount)',
  'event BatchMinted(address indexed to, uint256 amount)',
];

/**
 * Minimal ERC1155 Collection ABI
 * Based on ERC1155Collection.sol in zuno-marketplace-contracts
 */
export const ERC1155_COLLECTION_ABI = [
  // ERC1155 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',

  // Ownable
  'function owner() view returns (address)',

  // BaseCollection
  'function s_description() view returns (string)',
  'function s_mintPrice() view returns (uint256)',
  'function s_maxSupply() view returns (uint256)',
  'function s_mintLimitPerWallet() view returns (uint256)',
  'function s_totalMinted() view returns (uint256)',
  'function s_currentStage() view returns (uint8)',
  'function s_mintedPerWallet(address) view returns (uint256)',

  // Getter functions (if implemented)
  'function getMintPrice() view returns (uint256)',
  'function getMaxSupply() view returns (uint256)',
  'function getTotalMinted() view returns (uint256)',
  'function getCurrentStage() view returns (uint8)',

  // Minting functions
  // ERC1155Collection mints auto-increment tokenIds, only takes amount parameter
  'function mint(address to, uint256 amount) payable',
  'function batchMintERC1155(address to, uint256 amount) payable',

  // Events
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
  'event Minted(address indexed to, uint256 indexed tokenId, uint256 amount)',
  'event BatchMinted(address indexed to, uint256 amount)',
];
