import fs from 'fs';
import csv from 'csv-parser';

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', reject);
  });
}

async function calculateBalancesByTimeframe() {
  const data = await readCSV('wallet_activity_summary.csv');
  const balancesByTimeframe = {
    'Up to 30 days': 0,
    '31 to 90 days': 0,
    '91 to 180 days': 0,
    '181 to 360 days': 0,
    'Over 360 days': 0
  };

  data.forEach(row => {
    const timeframe = row.Timeframe;
    const balanceInETH = parseFloat(row.BalanceInETH);
    if (balancesByTimeframe[timeframe] !== undefined) {
      balancesByTimeframe[timeframe] += balanceInETH;
    }
  });

  console.log('Balances by Timeframe:', balancesByTimeframe);
}

calculateBalancesByTimeframe().catch(console.error);