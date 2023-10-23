import { Inject, Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import 'dotenv/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { format } from 'util';

export interface SampleSeller {
  id: string;
  email: string;
  mobile: string;
  category: string;
  domainID: string;
}

@Injectable()
export class SellerService {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  async scrapeContacts({ ids }) {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: process.env.PATH_CHROME,
      userDataDir: `/Users/jay.0412/Library/'Application Support'/Google/Chrome/Default`
    });
    this.logger.info(process.env.LOG_SELLER_SCRAPE_START, SellerService.name)
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(process.env.LINK_SELLERS_CONTACT);

    // await page.waitForTimeout(4000);
    // await page.click(process.env.ELEMENT_SIGNIN);
    // await page.waitForSelector(process.env.ELEMENT_IDENTIFIER_INPUT);
    // await page.type(
    //   process.env.ELEMENT_IDENTIFIER_INPUT,
    //   process.env.ADMIN_EMAIL,
    // );
    // await page.click(process.env.ELEMENT_IDENTIFIER_TAG);

    // await page.waitForSelector(process.env.ELEMENT_IDENTIFIER_INPUT);
    // await page.waitForTimeout(7000);
    // await page.click(process.env.ELEMENT_PASS_NEXT);

    // //2차 인증 문자 자동수신
    // await page.waitForSelector(process.env.ELEMENT_GOOGLE_AUTH_BUTTON);
    // await page.click(process.env.ELEMENT_GOOGLE_AUTH_BUTTON);
    // this.logger.info(process.env.LOG_AUTH_START, SellerService.name);

    // await page.waitForTimeout(11000);
    // await page.click(process.env.ELEMENT_GOOGLE_AUTH_BUTTON);
    // this.logger.info(process.env.LOG_ACCESS_CS, SellerService.name);

    let sellerList: SampleSeller[] = [];

    for (let i = 0; i < ids.length; i++) {
      let seller: SampleSeller = {
        id: ids[i],
        category: '',
        mobile: '',
        email: '',
        domainID: '',
      };
      await page.goto(process.env.LINK_SELLERS_LIST + ids[i]);
      await page.waitForTimeout(500);

      try {
        await page.waitForSelector(process.env.ELEMENT_CATEGORY);
        const categoryEle = await page.$x(process.env.ELEMENT_CATEGORY_XPATH);
        let categoryContent = await page.evaluate(
          (ele) => ele.textContent,
          categoryEle[0],
        );
        seller.category = categoryContent;

        await page.waitForSelector(process.env.ELEMENT_EMAIL);
        const emailEle = await page.$x(process.env.ELEMENT_EMAIL_XPATH);
        let emailContent = await page.evaluate(
          (ele) => ele.textContent,
          emailEle[0],
        );
        seller.email = emailContent;

        await page.waitForSelector(process.env.ELEMENT_MOBILE);
        const mobileEle = await page.$x(process.env.ELEMENT_MOBILE_XPATH);
        let mobileContent = await page.evaluate(
          (ele) => ele.textContent,
          mobileEle[0],
        );
        seller.mobile = mobileContent;
      } catch (error) {
        console.log(error);
      }
      sellerList.push(seller);
      this.logger.info(format(process.env.LOG_PROGRESS_SELLERS, ids[i]))
    }

    await page.goto(process.env.LINK_SELLER_DOMAIN_LOGIN);
    //TODO: 테스팅 필요
    await page.waitForSelector(process.env.ELEMENT_PCENTER_LOGIN);
    await page.type(process.env.ELEMENT_PCENTER_LOGIN, process.env.ADMIN_EMAIL);

    for (let i = 0; i < sellerList.length; i++) {
      let seller: SampleSeller = sellerList[i];
      await page.waitForSelector(process.env.ELEMENT_SEARCH_INPUT);
      await page.type(process.env.ELEMENT_SEARCH_INPUT, seller.id);
      await page.waitForTimeout(2000);
      const element: any = await page.waitForXPath(
        process.env.ELEMENT_SELLER_DIV_XPATH,
      );
      const hrefValue = await page.evaluate(
        (el) => el.getAttribute('href'),
        element,
      );
      seller.domainID = hrefValue.slice(1, -1);
      this.logger.info(format(process.env.LOG_PROGRESS_SELLER_DOMAIN, seller.id))
      await page.goto(process.env.LINK_SELLER_DOMAIN_HOME);

      console.log(seller);
    }
    await browser.close();
    const sellerListJSON = JSON.stringify(sellerList);
    return sellerListJSON;
  }
}
