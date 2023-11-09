import { Inject, Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import 'dotenv/config';
import * as xlsx from 'xlsx';
import { SlackService } from 'nestjs-slack';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { format } from 'util';

declare global {
  interface Window {
    multiOrder: boolean;
  }
}

@Injectable()
export class DeliveryService {
  constructor(
    private slackService: SlackService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async processLogin({ browser }) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1700, height: 840 });
    await page.goto(process.env.LINK_DELIVERY_LOGIN);

    const LOGIN_ELEMENT = process.env.ELEMENT_DELIVERY_LOGIN;
    await page.waitForSelector(LOGIN_ELEMENT);
    await page.evaluate((LOGIN_ELEMENT) => {
      const login: HTMLElement = document.querySelector(LOGIN_ELEMENT);
      if (login) login.click();
    }, LOGIN_ELEMENT);

    await page.waitForSelector(process.env.ELEMENT_DELIVERY_ID);
    await page.type(
      process.env.ELEMENT_DELIVERY_ID,
      process.env.ADMIN_DELIVERY_ID,
    );
    await page.type(
      process.env.ELEMENT_DELIVERY_PW,
      process.env.ADMIN_DELIVERY_PW,
    );

    const LOGIN_BUTTON_ELEMENT = process.env.ELEMENT_DELIVERY_LOGIN_BUTTON;
    await page.evaluate((LOGIN_BUTTON_ELEMENT) => {
      const loginButton: HTMLElement =
        document.querySelector(LOGIN_BUTTON_ELEMENT);
      if (loginButton) loginButton.click();
    }, LOGIN_BUTTON_ELEMENT);

    this.logger.info(process.env.LOG_LOGIN_SUCCESS, DeliveryService.name);

    const ACCESS_BUTTON_ELEMENT = process.env.ELEMENT_DELIVERY_LOGO;
    await page.waitForSelector(process.env.ELEMENT_DELIVERY_HEADERS);
    await page.evaluate((ACCESS_BUTTON_ELEMENT) => {
      const deliButton: HTMLElement = document.querySelector(
        ACCESS_BUTTON_ELEMENT,
      );
      if (deliButton) deliButton.click();
    }, ACCESS_BUTTON_ELEMENT);

    return page;
  }

  async requestDomestic() {
    this.logger.info(process.env.LOG_START_PARTIAL, DeliveryService.name);

    const browser = await puppeteer.launch({
      headless: false,
    });
    const page = await this.processLogin({ browser });

    await page.waitForSelector(process.env.ELEMENT_DELIVERY);
    await page.goto(process.env.LINK_DELIVERY_PAGE);

    //재고 할당 1번 처리
    const ALLOCATE_BUTTON_ELEMENT =
      process.env.ELEMENT_DELIVERY_ALLOCATE_BUTTON;
    await page.waitForSelector(ALLOCATE_BUTTON_ELEMENT);
    await page.evaluate((ALLOCATE_BUTTON_ELEMENT) => {
      const updateButton: HTMLElement = document.querySelector(
        ALLOCATE_BUTTON_ELEMENT,
      );
      if (updateButton) updateButton.click();
    }, ALLOCATE_BUTTON_ELEMENT);
    await page.waitForTimeout(1000);

    const ALLOCATE_CONFIRM_ELEMENT =
      process.env.ELEMENT_DELIVERY_CONFIRM;
    await page.evaluate((ALLOCATE_CONFIRM_ELEMENT) => {
      const confirmButton: HTMLElement = document.querySelector(
        ALLOCATE_CONFIRM_ELEMENT,
      );
      if (confirmButton) confirmButton.click();
    }, ALLOCATE_CONFIRM_ELEMENT);
    this.logger.info(process.env.LOG_COMPLETE_PARTIAL, DeliveryService.name);
    await page.waitForTimeout(8000);

    //해외배송 제외
    const EXPRESS_FLAG_ELEMENT = process.env.ELEMENT_EXPRESS_TAG;
    await page.waitForSelector(EXPRESS_FLAG_ELEMENT);
    await page.evaluate((EXPRESS_FLAG_ELEMENT) => {
      const expressCheckbox = document.querySelector(EXPRESS_FLAG_ELEMENT);
      if (expressCheckbox) expressCheckbox.parentElement.click();
    }, EXPRESS_FLAG_ELEMENT);
    await page.waitForTimeout(4000);

    let isFinal: boolean = false;

    //페이지네이션 버튼 클릭 처리
    while (true) {
      try {
        await page.waitForTimeout(1000);
        const buttonList = await this.fetchRequestButtons({ page });
        this.logger.info(
          format(process.env.LOG_PROGRESS_BUTTONS, buttonList.length),
          DeliveryService.name,
        );

        if (isFinal && buttonList.length == 0) break;
        if (buttonList.length > 0) {
          const PARTIAL_REQ_BUTTON =
            process.env.ELEMENT_DELIVERY_PARTIAL_REQ_BUTTON;
          await page.evaluate((PARTIAL_REQ_BUTTON) => {
            const button: HTMLButtonElement =
              document.querySelector(PARTIAL_REQ_BUTTON);
            button.click();
          }, PARTIAL_REQ_BUTTON);

          await page.waitForTimeout(1000);

          const popupButton = await page.waitForSelector(
            process.env.ELEMENT_DELIVERY_PARTIAL_CONFIRM_BUTTON,
          );
          // 주의: 클릭 후 첫 페이지로 돌아감 > 페이지 위주로 모아서 처리 불가
          if (popupButton) await popupButton.click();
          await page.waitForTimeout(1000);
        } else {
          await page.waitForTimeout(1000);
          isFinal = await this.evaluateNextPage({ page });
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        this.logger.error(
          process.env.LOG_ERROR_PARTIAL,
          error.stack,
          DeliveryService.name,
        );
      }
    }
    await browser.close();
    const timestamp = Math.floor(Date.now()/1000);
    const message = format(process.env.MESSAGE_CONTENT_DELIVERY_SUCCESS, timestamp);

    try {
      await this.notifyAlertSlack({ message });
    } catch(error) {
      console.log(error);
    }
    

    return process.env.DELIVERY_SUCCESS;
  }

  async evaluateNextPage({ page }) {
    await page.waitForSelector(process.env.ELEMENT_ACTIVE_BUTTON);
    const NEXT_ELEMENT = process.env.ELEMENT_NEXT_BUTTON;
    const status = await page.evaluate((NEXT_ELEMENT) => {
      const nextButton: HTMLElement = document.querySelector(NEXT_ELEMENT);
      if (nextButton) {
        nextButton.click();
        return false;
      } else return true;
    }, NEXT_ELEMENT);
    return status;
  }

  async fetchRequestButtons({ page }) {
    const partial_req_buttons = await page.$$eval(
      'button[class*="partial_request"]',
      (ele) => {
        const buttons = [];
        ele.forEach((form) => {
          const actionAttribute = form.getAttribute('class');
          if (actionAttribute && actionAttribute.includes('partial_request'))
            buttons.push(ele);
        });
        return buttons;
      },
    );
    return partial_req_buttons;
  }

  async convertID({ ids }) {
    const browser = await puppeteer.launch({
      headless: false,
    });

    const page = await this.processLogin({ browser });

    let idList = [];

    // 상품 번호 입력
    for (let i = 0; i < ids.length; i++) {
      // TODO: duplicate code > create searchBy function
      await page.waitForSelector(process.env.ELEMENT_DELIVERY);
      await page.goto(process.env.LINK_DELIVERY_PAGE);

      // 검색 옵션: 상품 번호 기준 검색
      await page.waitForSelector(process.env.ELEMENT_DELIVERY_SEARCH_INPUT);
      await page.select(
        process.env.ELEMENT_DELIVERY_SELECT,
        process.env.OPTION_DELI_PRODUCT_ID,
      );

      await page.type(process.env.ELEMENT_DELIVERY_SEARCH_FIELD, ids[i]);
      await page.waitForTimeout(500);

      const SEARCH_BUTTON = process.env.ELEMENT_DELIVERY_SEARCH_BUTTON;
      await page.evaluate((SEARCH_BUTTON) => {
        const searchButton: HTMLElement = document.querySelector(SEARCH_BUTTON);
        if (searchButton) searchButton.click();
      }, SEARCH_BUTTON);

      await page.waitForTimeout(1000);

      try {
        // 모든 상품 행 불러오기
        const extractedIds = await page.$$eval(
          process.env.ELEMENT_ROWS_TAG,
          (rows) => {
            const ids = [];
            if (rows) {
              console.log(rows)
              rows.forEach((row) => {
                const rowClass = row.getAttribute('class');
                if (rowClass === 'odd' || rowClass === 'even') {
                  const tdElements = row.querySelectorAll('td');
                  const id1 = tdElements[5].textContent.trim();
                  const id2 = tdElements[10].textContent.trim();
                  ids.push({ id1, id2 });
                }
              });
            }
            return ids;
          },
        );
        idList.push(...extractedIds);
      } catch (error) {
        this.logger.error(
          process.env.LOG_ERROR_MAPPING,
          error.stack,
          DeliveryService.name,
        );
      }
    }
    await browser.close();

    const list = idList.filter((item) => ids.includes(item.id1));
    const idSet = list.filter(
      (item, index, self) =>
        index ===
        self.findIndex((obj) => obj.id1 === item.id1 && obj.id2 === item.id2),
    );

    const timestamp = Math.floor(Date.now()/1000);
    const message = format(process.env.MESSAGE_CONTENT_ID_MAPPING_SUCCESS, timestamp);
    try {
      await this.notifyAlertSlack({ message });
    } catch(error) {
      console.log(error);
    }
    
    return JSON.stringify(idSet);
  }

  async cancelOrder({ ids, reasonID }) {
    const browser = await puppeteer.launch({
      headless: false
    });

    const page = await this.processLogin({ browser });

    let multiOrderStatus = false;
    const multiIds = [];

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 상품 번호 입력
    for (let i = 0; i < ids.length; i++) {
      await page.waitForSelector(process.env.ELEMENT_DELIVERY);
      await page.goto(process.env.LINK_DELIVERY_PAGE);

      // 검색 옵션: 고객사 상품주문번호 기준 검색
      await page.waitForSelector(process.env.ELEMENT_DELIVERY_SEARCH_INPUT);
      await page.select(
        process.env.ELEMENT_DELIVERY_SELECT,
        process.env.OPTION_MARKET_PRODUCT_ID,
      );

      await page.type(process.env.ELEMENT_DELIVERY_SEARCH_FIELD, ids[i]);
      await page.waitForTimeout(500);

      const SEARCH_BUTTON = process.env.ELEMENT_DELIVERY_SEARCH_BUTTON;
      await page.evaluate((SEARCH_BUTTON) => {
        const searchButton: HTMLElement = document.querySelector(SEARCH_BUTTON);
        if (searchButton) searchButton.click();
      }, SEARCH_BUTTON);

      await page.waitForTimeout(1000);

      try {
        const result = await page.$$eval(
          process.env.ELEMENT_ROWS_TAG,
          (rows) => {
            const idList = [];
            let multiOrder = false;
            if (rows.length > 1) multiOrder = true;
            if (rows) {
              rows.forEach((row) => {
                const rowClass = row.getAttribute('class');
                if (rowClass === 'odd' || rowClass === 'even') {
                  const tdElements = row.querySelectorAll('td');
                  const id1 = tdElements[5].textContent.trim();
                  const id2 = tdElements[10].textContent.trim();
                  idList.push({ id1, id2 });
                }
              });
            }
            return { idList, multiOrder };
          },
        );
        const { idList, multiOrder } = result;
        multiOrderStatus = multiOrder;
        const targetId = idList
          .filter((item) => ids.includes(item.id2))
          .map((item) => item.id1)
          .pop();
        this.logger.info(
          `${targetId} 건 확인 - 해당 주문 건 ${idList.length}개 상품 포함`,
          DeliveryService.name,
        );

        await page.waitForSelector(process.env.ELEMENT_EDIT_BUTTON_TAG);
        page.click(process.env.ELEMENT_EDIT_BUTTON);

        await page.waitForSelector(process.env.ELEMENT_CANCEL_SELECT);
        await page.select(`select[id*="_${targetId}_"]`, reasonID);

        // case 1 [단일 상품] 주문처리
        if (!multiOrderStatus) {
          const DELETE_BUTTON = process.env.ELEMENT_DELETE_ORDER_BUTTON;
          await page.evaluate((DELETE_BUTTON) => {
            const deleteOrderButton: HTMLElement =
              document.querySelector(DELETE_BUTTON);
            if (deleteOrderButton) deleteOrderButton.click();
          }, DELETE_BUTTON);
          await page.waitForTimeout(4000);
        }

        // case 2 [합배송] 주문처리
        if (multiOrderStatus) {
          multiIds.push(ids[i]);
          await page.evaluate((targetId) => {
            const deleteItemButton: HTMLElement = document.querySelector(
              `button[data-id*="${targetId}"]`,
            );
            if (deleteItemButton) deleteItemButton.click();
          }, targetId);

          await page.waitForSelector(process.env.ELEMENT_DELIVERY_CONFIRM);
          await page.click(process.env.ELEMENT_DELIVERY_CONFIRM);

          await page.waitForSelector(process.env.ELEMENT_EDIT_ORDER_BUTTON);
          await page.waitForTimeout(800);
          await page.click(process.env.ELEMENT_EDIT_ORDER_BUTTON);
          await page.waitForTimeout(800);

          await page.waitForSelector(process.env.ELEMENT_DELIVERY_CONFIRM);
          await page.click(process.env.ELEMENT_DELIVERY_CONFIRM);
        }
      } catch (error) {
        this.logger.error(
          process.env.LOG_ERROR_CANCEL,
          error.stack,
          DeliveryService.name,
        );
      }
    }
    await browser.close();
    const timestamp = Math.floor(Date.now()/1000);
    const message = format(process.env.MESSAGE_CONTENT_CANCEL_SUCCESS, timestamp)
    
    try {
      await this.notifyAlertSlack({ message });
    } catch(error) {
      console.log(error);
    }
    
    return JSON.stringify(multiIds);
  }

  async cancelCBU({ filePath }) {
    const rows = [];
    const fileContent = xlsx.readFile(filePath);
    const sheetName = fileContent.SheetNames[0];
    const activeSheet = fileContent.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(activeSheet);

    data.forEach((row, _) => {
      rows.push(row[process.env.LABEL_ID_COLUMN]);
    });
    console.log(rows);
    this.logger.info(
      process.env.LOG_ARGS_SUCCESS,
      DeliveryService.name,
    );

    try {
      await this.cancelOrder({ ids: rows, reasonID: 'no_longer_wanted' });
    } catch (error) {
      this.logger.error(
        process.env.LOG_ERROR_CANCEL,
        error.stack,
        DeliveryService.name,
      );
    }
  }

  async notifyAlertSlack({ message }) {
    this.slackService.sendText(message);
    this.logger.info(process.env.LOG_NOTIFICATION_SUCCESS, DeliveryService.name);
  }
}
