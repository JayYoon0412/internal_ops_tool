"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const puppeteer = require("puppeteer");
const fs = require("fs");
const csvParser = require("csv-parser");
const csv_writer_1 = require("csv-writer");
let AppService = exports.AppService = class AppService {
    async scrape(filePath) {
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
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
            if (link.indexOf('instagram.com') == -1) {
            }
            else {
                const browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 720 });
                await page.goto(link);
                await page.waitForTimeout(6000);
                const followersCount = await page.$x('//span[@class="_ac2a"]/@title');
                let followerNum = await page.evaluate((element) => element.textContent, followersCount[0]);
                let followerContent;
                if (followerNum.indexOf('만') != -1) {
                    followerNum = followerNum.slice(0, -1);
                    followerContent = parseFloat(followerNum) * 10000;
                }
                else {
                    followerContent = followerNum;
                }
                const profileLink = await page.$x('//span[@class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft"]');
                const linkContent = profileLink[0] ? await page.evaluate((element) => element.textContent, profileLink[0]) : '없음';
                console.log(linkContent);
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
};
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map