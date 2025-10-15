#!/usr/bin/env node

const { ethers } = require('ethers');
const { getProvider, getSigner, getMarketplaceHub } = require('../utils/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function buyNFT() {
  console.log('🛍️ NFT Marketplace Purchase Tool\n');

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const buyerAddress = await signer.getAddress();
    
    console.log(`📍 Connected to network: ${(await provider.getNetwork()).name}`);
    console.log(`👤 Your address: ${buyerAddress}\n`);

    // Get listing ID or NFT details
    let listingId = process.argv[2];
    let nftAddress, tokenId;

    if (!listingId || listingId.length !== 66) { // Not a valid listing ID
      // Try to find listing by NFT address and token ID
      nftAddress = listingId || await prompt('Enter NFT contract address: ');
      tokenId = process.argv[3] || await prompt('Enter token ID: ');
      
      console.log('\n🔍 Finding listing for this NFT...');
    } else {
      console.log(`📋 Listing ID: ${listingId}\n`);
    }

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    
    // Determine exchange address
    let exchangeAddress;
    if (nftAddress) {
      // Detect NFT type
      const nftContract = new ethers.Contract(
        nftAddress,
        ['function supportsInterface(bytes4) view returns (bool)'],
        provider
      );

      let isERC721 = false;
      try {
        isERC721 = await nftContract.supportsInterface('0x80ac58cd');
      } catch {
        isERC721 = true; // Assume ERC721 if interface check fails
      }

      exchangeAddress = isERC721 
        ? addresses.erc721Exchange
        : addresses.erc1155Exchange;

      // Get listing ID from NFT details
      const exchange = new ethers.Contract(
        exchangeAddress,
        [
          'function getListingByNFT(address,uint256) view returns (bytes32)',
          'function getListing(bytes32) view returns (tuple(address seller,address contractAddress,uint256 tokenId,uint256 amount,uint256 price,address paymentToken,uint256 expirationTime,bool isActive))',
        ],
        provider
      );

      try {
        listingId = await exchange.getListingByNFT(nftAddress, tokenId);
        if (listingId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          throw new Error('No active listing found for this NFT');
        }
      } catch (error) {
        throw new Error(`No active listing found for NFT ${nftAddress} token ID ${tokenId}`);
      }
    } else {
      // We have a listing ID, need to determine which exchange
      // Try ERC721 first
      exchangeAddress = await hub.getERC721Exchange();
    }

    // Get listing details
    const exchange = new ethers.Contract(
      exchangeAddress,
      [
        'function getListing(bytes32) view returns (tuple(address seller,address contractAddress,uint256 tokenId,uint256 amount,uint256 price,address paymentToken,uint256 expirationTime,bool isActive))',
        'function buyNFT(bytes32) payable',
        'event NFTSold(bytes32,address,uint256,uint256,uint256)',
      ],
      signer
    );

    let listing;
    try {
      listing = await exchange.getListing(listingId);
    } catch {
      // Try ERC1155 exchange if ERC721 failed
      exchangeAddress = await hub.getERC1155Exchange();
      const exchange1155 = new ethers.Contract(exchangeAddress, [
        'function getListing(bytes32) view returns (tuple(address seller,address contractAddress,uint256 tokenId,uint256 amount,uint256 price,address paymentToken,uint256 expirationTime,bool isActive))',
      ], provider);
      listing = await exchange1155.getListing(listingId);
    }

    // Validate listing
    if (!listing.isActive) {
      throw new Error('Listing is not active');
    }

    const now = Math.floor(Date.now() / 1000);
    if (listing.expirationTime < now) {
      throw new Error('Listing has expired');
    }

    if (listing.seller.toLowerCase() === buyerAddress.toLowerCase()) {
      throw new Error('You cannot buy your own NFT');
    }

    // Display listing details
    console.log('📋 Listing Details:');
    console.log(`   Seller: ${listing.seller}`);
    console.log(`   NFT Contract: ${listing.contractAddress}`);
    console.log(`   Token ID: ${listing.tokenId}`);
    if (listing.amount > 1) {
      console.log(`   Amount: ${listing.amount}`);
    }
    console.log(`   Price: ${ethers.formatEther(listing.price)} ETH`);
    
    const expirationDate = new Date(Number(listing.expirationTime) * 1000);
    console.log(`   Expires: ${expirationDate.toLocaleString()}\n`);

    // Calculate fees
    console.log('💰 Calculating fees...');
    
    const feeManager = await hub.getFeeManager();
    const feeManagerContract = new ethers.Contract(
      feeManager,
      ['function calculateFees(uint256) view returns (uint256,uint256,uint256)'],
      provider
    );

    const [platformFee, , totalPrice] = await feeManagerContract.calculateFees(listing.price);
    
    console.log(`   Listing Price: ${ethers.formatEther(listing.price)} ETH`);
    console.log(`   Platform Fee: ${ethers.formatEther(platformFee)} ETH`);
    console.log(`   Total Price: ${ethers.formatEther(totalPrice)} ETH\n`);

    // Check buyer balance
    const balance = await provider.getBalance(buyerAddress);
    if (balance < totalPrice) {
      throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalPrice)} ETH`);
    }

    // Confirm purchase
    const confirm = await prompt(`Confirm purchase for ${ethers.formatEther(totalPrice)} ETH? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('Purchase cancelled.');
      process.exit(0);
    }

    // Execute purchase
    console.log('\n📤 Purchasing NFT...');
    const tx = await exchange.buyNFT(listingId, { value: totalPrice });
    console.log(`   ⏳ Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    // Extract sale details from events
    const saleEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id('NFTSold(bytes32,address,uint256,uint256,uint256)')
    );

    console.log('\n✅ NFT Purchased Successfully!');
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   NFT Contract: ${listing.contractAddress}`);
    console.log(`   Token ID: ${listing.tokenId}`);
    if (listing.amount > 1) {
      console.log(`   Amount: ${listing.amount}`);
    }
    console.log(`   Total Paid: ${ethers.formatEther(totalPrice)} ETH\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
buyNFT().catch(console.error);
