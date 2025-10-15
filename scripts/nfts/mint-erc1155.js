/**
 * Mint NFTs on an ERC1155 Collection
 * Usage: node scripts/nfts/mint-erc1155.js [collectionAddress] [tokenId] [amount]
 */

const { ethers } = require("ethers");
const {
  getProviderAndSigner,
  waitForTransaction,
  ERC1155_ABI
} = require("../utils/config");

// Extended ABI for minting functions (Updated for Zuno contracts)
const MINT_ABI = [
  ...ERC1155_ABI,
  "function mint(address to, uint256 amount) external payable", // Creates new token ID
  "function batchMintERC1155(address to, uint256 amount) external payable", // Creates multiple new token IDs
  "function getMintPrice() external view returns (uint256)",
  "function getMaxSupply() external view returns (uint256)",
  "function getTotalMinted() external view returns (uint256)",
  "function getMintLimitPerWallet() external view returns (uint256)",
  "function getMintedPerWallet(address account) external view returns (uint256)",
  "function getCurrentStage() external view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

async function mintERC1155(collectionAddress, tokenId = null, amount = 1, recipientAddress = null) {
  try {
    // Note: In Zuno contracts, tokenId is not used - mint() creates a new token ID
    // The tokenId parameter is kept for compatibility but will be ignored
    
    // Validate inputs
    if (!collectionAddress || !ethers.isAddress(collectionAddress)) {
      throw new Error("Invalid collection address");
    }

    // Connect to network
    const { provider, signer, account } = await getProviderAndSigner();
    const recipient = recipientAddress || account;
    
    // Connect to collection
    const collection = new ethers.Contract(collectionAddress, MINT_ABI, signer);
    
    console.log("\n📝 Collection Information:");
    console.log("   Address:", collectionAddress);
    
    // Get collection info
    let name, symbol, uri, mintPrice;
    try {
      name = await collection.name();
      symbol = await collection.symbol();
      console.log("   Name:", name || "N/A");
      console.log("   Symbol:", symbol || "N/A");
    } catch (e) {
      console.log("   Name/Symbol: Unable to fetch");
    }
    
    try {
      uri = await collection.uri(0); // Get base URI
      console.log("   Token URI:", uri || "N/A");
    } catch (e) {
      console.log("   Token URI: Unable to fetch");
    }
    
    // Get current minting stats
    try {
      const totalMinted = await collection.getTotalMinted();
      const maxSupply = await collection.getMaxSupply();
      console.log(`   Total Minted: ${totalMinted}`);
      console.log(`   Max Supply: ${maxSupply}`);
    } catch (e) {
      // Method might not exist
    }
    
    // Try to get mint price
    try {
      mintPrice = await collection.getMintPrice();
    } catch (e) {
      mintPrice = ethers.parseEther("0.005"); // Default for ERC1155
      console.log("   Mint Price: Using default 0.005 ETH");
    }
    
    if (mintPrice) {
      console.log("   Mint Price (per token):", ethers.formatEther(mintPrice), "ETH");
    }
    
    const totalCost = mintPrice * BigInt(amount);
    console.log(`   Total Cost for ${amount} token(s):`, ethers.formatEther(totalCost), "ETH");
    
    console.log("\n🎯 Minting Parameters:");
    console.log("   Recipient:", recipient);
    console.log("   Amount:", amount);
    console.log("   Note: Will create new token ID(s)");
    
    // Try different mint methods
    let tx;
    let success = false;
    
    // Method 1: Try mint(address, amount) - Zuno's ERC1155 mint function
    if (!success) {
      try {
        console.log("\n🔄 Attempting mint(to, amount)...");
        tx = await collection.mint(recipient, amount, { value: totalCost });
        success = true;
      } catch (e) {
        console.log("   mint failed:", e.message || e);
        throw new Error("Failed to mint ERC1155 tokens: " + (e.message || e));
      }
    }
    
    if (success && tx) {
      const receipt = await waitForTransaction(tx, "Mint ERC1155 Token");
      
      console.log("\n✅ Token(s) minted successfully!");
      console.log(`   Minted ${amount} token(s)`);
      
      // Try to parse TransferSingle event
      try {
        const transferEvents = receipt.logs.filter(log => {
          try {
            const parsed = collection.interface.parseLog(log);
            return parsed?.name === "TransferSingle" || parsed?.name === "TransferBatch";
          } catch {
            return false;
          }
        });
        
        if (transferEvents.length > 0) {
          console.log("\n📦 Transfer Events:");
          transferEvents.forEach(event => {
            const parsed = collection.interface.parseLog(event);
            if (parsed.name === "TransferSingle") {
              console.log(`   Token #${parsed.args[3]}: ${parsed.args[4]} units`);
            }
          });
        }
      } catch (e) {
        // Event parsing failed
      }
      
      // Check new balance
      try {
        const balance = await collection.balanceOf(recipient, tokenId);
        console.log(`\n📊 New Balance: ${balance} units of Token #${tokenId}`);
      } catch (e) {
        // Balance check failed
      }
    }
    
  } catch (error) {
    console.error("\n❌ Error minting ERC1155 token:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const collectionAddress = args[0];
  const tokenId = parseInt(args[1]) || 1;
  const amount = parseInt(args[2]) || 1;
  const recipient = args[3];
  
  if (!collectionAddress) {
    console.error("Usage: node mint-erc1155.js <collectionAddress> [tokenId] [amount] [recipient]");
    console.error("Example: node mint-erc1155.js 0x123... 1 100");
    process.exit(1);
  }
  
  mintERC1155(collectionAddress, tokenId, amount, recipient)
    .then(() => {
      console.log("\n✨ Minting completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Minting failed:", error);
      process.exit(1);
    });
}

module.exports = { mintERC1155 };
