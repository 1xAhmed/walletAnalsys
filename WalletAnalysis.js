import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';
import { createObjectCsvWriter } from 'csv-writer';
import moment from 'moment';
import { formatUnits } from 'ethers';

const API_KEY = '';

async function getTransactions(address) {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&apikey=${API_KEY}`;
  const response = await axios.get(url);
  return response.data.result;
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const holders = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        holders.push({
          address: row.HolderAddress,
          balance: row.Balance // Keep balance in WEI for now
        });
      })
      .on('end', () => {
        resolve(holders);
      })
      .on('error', reject);
  });
}


function formattedStringToEth(formattedString) {
  if (!formattedString) {
    return '0';
  }
  // Remove commas from the number string
  const cleanString = formattedString.replace(/,/g, '');
  // Parse the cleaned string as a float and multiply by 1e18 to get the value in Wei
  const weiValue = BigInt(Math.floor(parseFloat(cleanString) * 1e18));
  // Convert the Wei value to Ether
  return formatUnits(weiValue, 'ether');
}

async function main() {
  const holders = await readCSV('ernHolders.csv');
  console.log('Holders read from CSV:', holders.length);




  const activitySegments = {
    'Up to 30 days': 0,
    '31 to 90 days': 0,
    '91 to 180 days': 0,
    '181 to 360 days': 0,
    'Over 360 days': 0
  };

  const holderDetails = [];

  for (const holder of holders) {
    const transactions = await getTransactions(holder.address);
    console.log(`Transactions for ${holder.address}:`,);

    let segment = 'Over 360 days';
    if (transactions.length > 0) {
      const lastTransactionDate = moment.unix(transactions[transactions.length - 1].timeStamp);
      const daysSinceLastTransaction = moment().diff(lastTransactionDate, 'days');

      if (daysSinceLastTransaction <= 30) {
        segment = 'Up to 30 days';
      } else if (daysSinceLastTransaction <= 90) {
        segment = '31 to 90 days';
      } else if (daysSinceLastTransaction <= 180) {
        segment = '91 to 180 days';
      } else if (daysSinceLastTransaction <= 360) {
        segment = '181 to 360 days';
      }
    }

    activitySegments[segment]++;
    const balanceInEth = formattedStringToEth(holder.balance);
    holderDetails.push({
      address: holder.address,
      balance: balanceInEth,
      segment: segment
    });

    // Write the current holder details to the CSV file
    const csvWriter = createObjectCsvWriter({
      path: 'wallet_activity_summary.csv',
      header: [
        { id: 'address', title: 'Address' },
        { id: 'balance', title: 'Balance (ETH)' },
        { id: 'segment', title: 'Activity Period' }
      ],
      append: true
    });

    await csvWriter.writeRecords([{
      address: holder.address,
      balance: balanceInEth,
      segment: segment
    }]);
  }

  console.log('Activity Segments:', activitySegments);

  // Write the summary report to the CSV file
  const summaryCsvWriter = createObjectCsvWriter({
    path: 'wallet_activity_summary.csv',
    header: [
      { id: 'address', title: 'Address' },
      { id: 'balance', title: 'Balance (ETH)' },
      { id: 'segment', title: 'Activity Period' }
    ],
    append: true
  });

  console.log('Summary report written to wallet_activity_summary.csv');
}

main().catch(console.error);