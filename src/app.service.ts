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
        { id: 'link', title: '인스타 링크' },
        { id: 'followerContent', title: '팔로워 수' },
        { id: 'linkContent', title: '헤더 링크' },
      ],
    });

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', async (row) => {
        const link = row.instalink;
        if (link.indexOf('instagram.com')==-1) {
          //인스타그램 링크가 아닐시 무시
        } else {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(link);
        await page.waitForTimeout(6000);

        const followersCount = await page.$x('//span[@class="_ac2a"]/@title')
        let followerNum = await page.evaluate((element) => element.textContent, followersCount[0]);
        
        //불러온 데이터 프로세싱: 숫자 형태로 모두 변환
        let followerContent : string | number;
        if (followerNum.indexOf('만')!=-1) {
          followerNum = followerNum.slice(0, -1);
          followerContent = parseFloat(followerNum) * 10000;
        } else {
          followerContent = followerNum
        }
        
        const profileLink = await page.$x('//span[@class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft"]')
        const linkContent = profileLink[0] ? await page.evaluate((element) => element.textContent, profileLink[0]) : '없음';

        await csvWriter.writeRecords([{ link, followerContent, linkContent }]);
        await browser.close();
      }
      })
      .on('end', async () => {
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
