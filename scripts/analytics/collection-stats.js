#!/usr/bin/env node

const { ethers } = require('ethers');
const { getProvider, getSigner, getMarketplaceHub } = require('../utils/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function getCollectionStats() {
  console.log('📊 Collection Analytics Tool\n');

  try {
    // Get network and provider
    const provider = await getProvider();
    const signer = await getSigner();
    
    console.log(`📍 Connected to network: ${(await provider.getNetwork()).name}\n`);

    // Get collection address
    const collectionAddress = process.argv[2] || await prompt('Enter collection address: ');
    
    // Get collection basic info
    const collection = new ethers.Contract(
      collectionAddress,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function maxSupply() view returns (uint256)',
        'function owner() view returns (address)',
      ],
      provider
    );

    let collectionName, collectionSymbol, totalSupply, maxSupply, owner;
    
    try {
      collectionName = await collection.name();
      collectionSymbol = await collection.symbol();
    } catch {
      collectionName = 'Unknown';
      collectionSymbol = '???';
    }

    try {
      totalSupply = await collection.totalSupply();
    } catch {
      totalSupply = 0n;
    }

    try {
      maxSupply = await collection.maxSupply();
    } catch {
      maxSupply = 0n;
    }

    try {
      owner = await collection.owner();
    } catch {
      owner = 'Not Available';
    }

    console.log('📋 Collection Info:');
    console.log(`   Name: ${collectionName}`);
    console.log(`   Symbol: ${collectionSymbol}`);
    console.log(`   Contract: ${collectionAddress}`);
    console.log(`   Total Supply: ${totalSupply}`);
    if (maxSupply > 0) {
      console.log(`   Max Supply: ${maxSupply}`);
    }
    if (owner !== 'Not Available') {
      console.log(`   Owner: ${owner}`);
    }
    console.log('');

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    
    // Get History Tracker for analytics
    const historyTrackerAddress = addresses.listingHistoryTracker;
    const historyTracker = new ethers.Contract(
      historyTrackerAddress,
      [
        'function collectionStats(address) view returns (tuple(uint256 totalListings,uint256 totalSales,uint256 totalVolume,uint256 floorPrice,uint256 averagePrice,uint256 highestSale,uint256 activeListings,uint256 lastUpdated))',
        'function getCollectionPriceHistory(address,uint256) view returns (tuple(uint256 price,uint256 timestamp,uint256 volume,uint8 source)[])',
        'function nftHistoryMeta(address,uint256) view returns (tuple(uint256 totalTransactions,uint256 totalVolume,uint256 lastSalePrice,uint256 lastSaleTime,address currentOwner))',
        'function globalStats() view returns (tuple(uint256 totalListings,uint256 totalSales,uint256 totalVolume,uint256 totalUsers,uint256 totalCollections,uint256 averageSalePrice,uint256 dailyActiveUsers,uint256 lastUpdated))',
        'function dailyVolumes(uint256) view returns (tuple(uint256 volume,uint256 transactions,uint256 uniqueUsers,uint256 averagePrice))',
      ],
      provider
    );

    // Get collection statistics
    console.log('📊 Collection Statistics:');
    
    try {
      const stats = await historyTracker.collectionStats(collectionAddress);
      
      console.log(`   Total Listings: ${stats.totalListings}`);
      console.log(`   Total Sales: ${stats.totalSales}`);
      console.log(`   Total Volume: ${ethers.formatEther(stats.totalVolume)} ETH`);
      
      if (stats.floorPrice > 0n) {
        console.log(`   Floor Price: ${ethers.formatEther(stats.floorPrice)} ETH`);
      } else {
        console.log(`   Floor Price: No active listings`);
      }
      
      if (stats.averagePrice > 0n) {
        console.log(`   Average Price: ${ethers.formatEther(stats.averagePrice)} ETH`);
      }
      
      if (stats.highestSale > 0n) {
        console.log(`   Highest Sale: ${ethers.formatEther(stats.highestSale)} ETH`);
      }
      
      console.log(`   Active Listings: ${stats.activeListings}`);
      
      if (stats.lastUpdated > 0n) {
        const lastUpdated = new Date(Number(stats.lastUpdated) * 1000);
        console.log(`   Last Updated: ${lastUpdated.toLocaleString()}`);
      }
    } catch (error) {
      console.log(`   ⚠️ No trading history available`);
    }
    
    console.log('');

    // Get 24h volume data
    console.log('📈 24 Hour Activity:');
    
    try {
      const today = Math.floor(Date.now() / 1000 / 86400);
      const yesterday = today - 1;
      
      const todayVolume = await historyTracker.dailyVolumes(today);
      const yesterdayVolume = await historyTracker.dailyVolumes(yesterday);
      
      console.log(`   Today's Volume: ${ethers.formatEther(todayVolume.volume)} ETH`);
      console.log(`   Today's Sales: ${todayVolume.transactions}`);
      console.log(`   Unique Traders: ${todayVolume.uniqueUsers}`);
      
      if (todayVolume.averagePrice > 0n) {
        console.log(`   Average Price: ${ethers.formatEther(todayVolume.averagePrice)} ETH`);
      }
      
      // Calculate 24h change
      if (yesterdayVolume.volume > 0n) {
        const volumeChange = ((todayVolume.volume - yesterdayVolume.volume) * 100n) / yesterdayVolume.volume;
        const sign = volumeChange >= 0n ? '+' : '';
        console.log(`   24h Volume Change: ${sign}${volumeChange}%`);
      }
    } catch (error) {
      console.log(`   ⚠️ Volume data not available`);
    }
    
    console.log('');

    // Get recent price history
    console.log('📉 Recent Sales (Last 10):');
    
    try {
      const priceHistory = await historyTracker.getCollectionPriceHistory(collectionAddress, 10);
      
      if (priceHistory.length > 0) {
        priceHistory.slice(0, 10).forEach((sale, i) => {
          const saleDate = new Date(Number(sale.timestamp) * 1000);
          const sourceText = sale.source === 0 ? 'Direct Sale' : 
                           sale.source === 1 ? 'Auction' : 
                           sale.source === 2 ? 'Offer' : 'Bundle';
          
          console.log(`   ${i + 1}. ${ethers.formatEther(sale.price)} ETH - ${sourceText} - ${saleDate.toLocaleDateString()}`);
        });
      } else {
        console.log(`   No recent sales`);
      }
    } catch (error) {
      console.log(`   ⚠️ Price history not available`);
    }
    
    console.log('');

    // Get active listings from exchanges
    console.log('🏷️ Active Listings:');
    
    try {
      const erc721Exchange = await hub.getERC721Exchange();
      const exchange = new ethers.Contract(
        erc721Exchange,
        [
          'function getCollectionListings(address) view returns (bytes32[])',
          'function getListing(bytes32) view returns (tuple(address seller,address contractAddress,uint256 tokenId,uint256 amount,uint256 price,address paymentToken,uint256 expirationTime,bool isActive))',
        ],
        provider
      );

      const listingIds = await exchange.getCollectionListings(collectionAddress);
      const activeListings = [];

      for (const listingId of listingIds.slice(0, 5)) { // Show first 5
        const listing = await exchange.getListing(listingId);
        if (listing.isActive) {
          activeListings.push(listing);
        }
      }

      if (activeListings.length > 0) {
        activeListings.forEach((listing, i) => {
          console.log(`   Token #${listing.tokenId}: ${ethers.formatEther(listing.price)} ETH`);
        });
        
        if (listingIds.length > 5) {
          console.log(`   ... and ${listingIds.length - 5} more listings`);
        }
      } else {
        console.log(`   No active listings`);
      }
    } catch (error) {
      console.log(`   ⚠️ Could not fetch active listings`);
    }

    console.log('');

    // Get global marketplace stats for comparison
    console.log('🌍 Global Marketplace Stats:');
    
    try {
      const globalStats = await historyTracker.globalStats();
      
      console.log(`   Total Market Volume: ${ethers.formatEther(globalStats.totalVolume)} ETH`);
      console.log(`   Total Transactions: ${globalStats.totalSales}`);
      console.log(`   Total Users: ${globalStats.totalUsers}`);
      console.log(`   Total Collections: ${globalStats.totalCollections}`);
      
      if (globalStats.averageSalePrice > 0n) {
        console.log(`   Average Sale Price: ${ethers.formatEther(globalStats.averageSalePrice)} ETH`);
      }
      
      console.log(`   Daily Active Users: ${globalStats.dailyActiveUsers}`);
    } catch (error) {
      console.log(`   ⚠️ Global stats not available`);
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
getCollectionStats().catch(console.error);
