#!/usr/bin/env node

const { ethers } = require('ethers');
const { getProvider, getSigner, getMarketplaceHub } = require('../utils/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function placeBid() {
  console.log('🎯 Auction Bidding Tool\n');

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const bidderAddress = await signer.getAddress();
    
    console.log(`📍 Connected to network: ${(await provider.getNetwork()).name}`);
    console.log(`👤 Your address: ${bidderAddress}\n`);

    // Get auction ID
    const auctionId = process.argv[2] || await prompt('Enter auction ID: ');
    
    if (!auctionId || auctionId.length !== 66) {
      throw new Error('Invalid auction ID format');
    }

    console.log(`📋 Auction ID: ${auctionId}\n`);

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    
    // Get auction contracts
    const englishAuctionAddress = addresses.englishAuction;
    const dutchAuctionAddress = addresses.dutchAuction;

    // Try to get auction details from English auction first
    let auctionContract;
    let auctionType = 'english';
    let auctionDetails;

    const englishAuction = new ethers.Contract(
      englishAuctionAddress,
      [
        'function getAuction(bytes32) view returns (tuple(address seller,address nftContract,uint256 tokenId,uint256 amount,uint256 startingPrice,uint256 reservePrice,uint256 currentBid,address highestBidder,uint256 startTime,uint256 endTime,bool isActive))',
        'function placeBid(bytes32) payable',
        'function buyNow(bytes32) payable',
        'function getCurrentPrice(bytes32) view returns (uint256)',
        'event BidPlaced(bytes32,address,uint256,uint256,address)',
      ],
      signer
    );

    const dutchAuction = new ethers.Contract(
      dutchAuctionAddress,
      [
        'function getAuction(bytes32) view returns (tuple(address seller,address nftContract,uint256 tokenId,uint256 amount,uint256 startingPrice,uint256 endingPrice,uint256 startTime,uint256 endTime,bool isActive,bool isSold))',
        'function getCurrentPrice(bytes32) view returns (uint256)',
        'function buyNow(bytes32) payable',
        'event DutchAuctionPurchased(bytes32,address,uint256,uint256,uint256)',
      ],
      signer
    );

    // Check if it's an English auction
    try {
      auctionDetails = await englishAuction.getAuction(auctionId);
      if (auctionDetails.isActive) {
        auctionContract = englishAuction;
        auctionType = 'english';
      }
    } catch (e) {
      // Not an English auction, try Dutch
      try {
        auctionDetails = await dutchAuction.getAuction(auctionId);
        if (auctionDetails.isActive) {
          auctionContract = dutchAuction;
          auctionType = 'dutch';
        }
      } catch {
        throw new Error('Auction not found or not active');
      }
    }

    if (!auctionDetails || !auctionDetails.isActive) {
      throw new Error('Auction not found or not active');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > Number(auctionDetails.endTime)) {
      throw new Error('Auction has ended');
    }

    if (auctionDetails.seller.toLowerCase() === bidderAddress.toLowerCase()) {
      throw new Error('You cannot bid on your own auction');
    }

    // Display auction details
    console.log('🔨 Auction Details:');
    console.log(`   Type: ${auctionType === 'english' ? 'English' : 'Dutch'} Auction`);
    console.log(`   Seller: ${auctionDetails.seller}`);
    console.log(`   NFT Contract: ${auctionDetails.nftContract}`);
    console.log(`   Token ID: ${auctionDetails.tokenId}`);
    if (auctionDetails.amount > 1) {
      console.log(`   Amount: ${auctionDetails.amount}`);
    }

    const endTime = new Date(Number(auctionDetails.endTime) * 1000);
    const timeLeft = Number(auctionDetails.endTime) - now;
    const daysLeft = Math.floor(timeLeft / 86400);
    const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
    const minutesLeft = Math.floor((timeLeft % 3600) / 60);

    console.log(`   Ends: ${endTime.toLocaleString()}`);
    console.log(`   Time Left: ${daysLeft}d ${hoursLeft}h ${minutesLeft}m\n`);

    if (auctionType === 'english') {
      // English auction - place bid
      console.log('💰 English Auction Info:');
      console.log(`   Starting Price: ${ethers.formatEther(auctionDetails.startingPrice)} ETH`);
      
      if (auctionDetails.reservePrice > 0n) {
        console.log(`   Reserve Price: ${auctionDetails.reservePrice > auctionDetails.currentBid ? 'Not Met' : 'Met'}`);
      }

      if (auctionDetails.currentBid > 0n) {
        console.log(`   Current Bid: ${ethers.formatEther(auctionDetails.currentBid)} ETH`);
        console.log(`   Highest Bidder: ${auctionDetails.highestBidder}`);
        
        const minBidIncrement = auctionDetails.currentBid * 101n / 100n; // 1% increment
        console.log(`   Minimum Next Bid: ${ethers.formatEther(minBidIncrement)} ETH\n`);
      } else {
        console.log(`   No bids yet`);
        console.log(`   Minimum Bid: ${ethers.formatEther(auctionDetails.startingPrice)} ETH\n`);
      }

      // Get bid amount
      const bidAmountEth = await prompt('Enter your bid amount (in ETH): ');
      const bidAmount = ethers.parseEther(bidAmountEth);

      // Validate bid amount
      const minimumBid = auctionDetails.currentBid > 0n 
        ? auctionDetails.currentBid * 101n / 100n 
        : auctionDetails.startingPrice;

      if (bidAmount < minimumBid) {
        throw new Error(`Bid must be at least ${ethers.formatEther(minimumBid)} ETH`);
      }

      // Check balance
      const balance = await provider.getBalance(bidderAddress);
      if (balance < bidAmount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH`);
      }

      // Place bid
      console.log(`\n📤 Placing bid of ${bidAmountEth} ETH...`);
      const tx = await auctionContract.placeBid(auctionId, { value: bidAmount });
      console.log(`   ⏳ Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      console.log('\n✅ Bid Placed Successfully!');
      console.log(`   Your Bid: ${ethers.formatEther(bidAmount)} ETH`);
      console.log(`   Transaction: ${tx.hash}`);
      
      if (auctionDetails.currentBid > 0n) {
        console.log(`\n💡 Note: The previous highest bidder will be automatically refunded.`);
      }
      
      console.log(`\n💡 Next steps:`);
      console.log(`   - Monitor the auction for competing bids`);
      console.log(`   - If outbid, you'll be automatically refunded`);
      console.log(`   - If you win, the NFT will be transferred when auction ends`);

    } else {
      // Dutch auction - buy at current price
      console.log('💰 Dutch Auction Info:');
      console.log(`   Starting Price: ${ethers.formatEther(auctionDetails.startingPrice)} ETH`);
      console.log(`   Ending Price: ${ethers.formatEther(auctionDetails.endingPrice)} ETH`);
      
      // Get current price
      const currentPrice = await auctionContract.getCurrentPrice(auctionId);
      console.log(`   Current Price: ${ethers.formatEther(currentPrice)} ETH\n`);

      // Calculate price drop info
      const totalDuration = Number(auctionDetails.endTime) - Number(auctionDetails.startTime);
      const elapsed = now - Number(auctionDetails.startTime);
      const percentComplete = (elapsed * 100) / totalDuration;
      
      console.log(`   Price Progress: ${percentComplete.toFixed(1)}% complete`);
      
      const priceDropPerHour = (auctionDetails.startingPrice - auctionDetails.endingPrice) / BigInt(totalDuration / 3600);
      console.log(`   Price drops by: ~${ethers.formatEther(priceDropPerHour)} ETH per hour\n`);

      // Check balance
      const balance = await provider.getBalance(bidderAddress);
      if (balance < currentPrice) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(currentPrice)} ETH`);
      }

      // Confirm purchase
      const confirm = await prompt(`Buy now at ${ethers.formatEther(currentPrice)} ETH? (yes/no): `);
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Purchase cancelled.');
        process.exit(0);
      }

      // Buy at current price
      console.log(`\n📤 Purchasing at current price...`);
      const tx = await auctionContract.buyNow(auctionId, { value: currentPrice });
      console.log(`   ⏳ Transaction: ${tx.hash}`);
      
      await tx.wait();
      
      console.log('\n✅ NFT Purchased Successfully!');
      console.log(`   Purchase Price: ${ethers.formatEther(currentPrice)} ETH`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   NFT Contract: ${auctionDetails.nftContract}`);
      console.log(`   Token ID: ${auctionDetails.tokenId}\n`);
    }

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
placeBid().catch(console.error);
