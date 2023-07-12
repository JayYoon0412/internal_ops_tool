import { Injectable, Res } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

@Injectable()
export class AppService {
  async scrape(filePath: string) {
    const csvWriter = createObjectCsvWriter({
      path: 'followers_data.csv',
      header: [ 
        { id: 'number', title: 'no' },
        { id: 'name', title: 'store_name' },
        { id: 'storeId', title: 'store_ID' },
        { id: 'link', title: 'sns_url' },
        { id: 'followerContent', title: 'followers' }
      ],
    });

    const rows: any[] = [];
    let rowIndex = 0;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', async () => {
        const chunkSize = 30;
        const totalRows = rows.length;

        for (let startIndex = 0; startIndex < totalRows; startIndex += chunkSize) {
          const endIndex = Math.min(startIndex + chunkSize, totalRows);
          const chunkRows = rows.slice(startIndex, endIndex);

          const browser = await puppeteer.launch({ headless: false });

          const promises = chunkRows.map(async (row) => {
            const link = row.instalink;
            const number = row.number;
            const name = row.store_name;
            const storeId = row.store_ID;

            if (link.indexOf('instagram.com') === -1) {
              // 경우 1: SNS가 인스타그램이 아닐 경우
              let followerContent = ''
              await csvWriter.writeRecords([{ number, name, storeId, link, followerContent }]);
              return;
            }

            try {
              const page = await browser.newPage();
              await page.setViewport({ width: 1280, height: 720 });
              await page.goto(link);
              await page.waitForTimeout(10000);

              const followersCount = await page.$x('//span[@class="_ac2a"]/@title');
              let followerNum = await page.evaluate((element) => element.textContent, followersCount[0]);

              // 만 단위 숫자로 변환
              let followerContent: string | number;
              if (followerNum.indexOf('만') !== -1) {
                followerNum = followerNum.slice(0, -1);
                followerContent = parseFloat(followerNum) * 10000;
              } else {
                followerContent = followerNum;
              }

              await csvWriter.writeRecords([{ number, name, storeId, link, followerContent }]);
            } catch (error) {
              // 경우 2: 잘못된 인스타그램 링크일 경우
              console.log('WARNING: invalid link');
              let followerContent = 'wrong link'
              await csvWriter.writeRecords([{ number, name, storeId, link, followerContent }]);
            }
          });

          await Promise.all(promises);

          await browser.close();
        }

        console.log('Scraping completed successfully!');
      });
  }

  async downloadCsvFile(response) {
    const filePath = 'followers_data.csv';

    const fileReadStream = fs.createReadStream(filePath);
    response.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=followers_data.csv',
    });
    fileReadStream.pipe(response);
  }
}


