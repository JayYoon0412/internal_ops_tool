import { Inject, Injectable } from "@nestjs/common";
import { JWT } from 'google-auth-library'
import { GoogleSpreadsheet } from "google-spreadsheet";
import 'dotenv/config';
import { SlackService } from "nestjs-slack";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { format } from "util";


@Injectable()
export class FileService {

  serviceAccountAuth: JWT;

    constructor(
        private slackService: SlackService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {
      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
        key: process.env.GOOGLE_SERVICE_PRIVATE_KEY,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ],
      });
      this.serviceAccountAuth = serviceAccountAuth;
    }

    async loadDocs() {
        let resultJSON = {};
      
          const doc = new GoogleSpreadsheet(process.env.SHEET_IB_SELLER, this.serviceAccountAuth);
          
          await doc.loadInfo();
          const sheet = doc.sheetsByIndex[0];
          const rows = await sheet.getRows();
          const totalCount = rows[5].get(process.env.LABEL_SUM_COLUMN);
          const sellerIntCount = parseFloat(totalCount.replace('%', '')) * 10;
          const { lastSevenDates, lastSevenIncs } = await this.fetchDateLabels();

          resultJSON['totalCount'] = sellerIntCount;
          resultJSON['dateLabels'] = lastSevenDates;
          resultJSON['sellerIncValues'] = lastSevenIncs;
          return JSON.stringify(resultJSON);
    }

    async fetchDateLabels() {
      const doc = new GoogleSpreadsheet(process.env.SHEET_DAILY_TRACKING, this.serviceAccountAuth);
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      const lastSevenRows = rows.slice(-7);
      const lastSevenDates = lastSevenRows.map((row: any) => row.get('date_timestamp'));
      const lastSevenIncs = lastSevenRows.map((row: any) => row.get('seller_incr_count'));
      return { lastSevenDates, lastSevenIncs };
    }

    async insertRow({ rowDto }) {
          const { seller, check, returns, oos, partialOB, totalOB, userCancel, oosCancel, date } = rowDto;
          
          const doc = new GoogleSpreadsheet(process.env.SHEET_DAILY_TRACKING, this.serviceAccountAuth);
          await doc.loadInfo(); 
          const sheet = doc.sheetsByIndex[0];

          const newRow = await sheet.addRow({
            date_timestamp: date,
            seller_incr_count: seller,
            ib_check_count: check,
            return_count: returns,
            oos_count: oos,
            partial_ob_count: partialOB,
            total_ob_count: totalOB,
            cancel_oos_count: oosCancel,
            user_cancel_count: userCancel
        });
        console.log(newRow)
        this.logger.info(process.env.LOG_UPDATE_SUCCESS, FileService.name)

        const timestamp = Math.floor(Date.now()/1000);
        const message = format(process.env.MESSAGE_CONTENT_UPDATE_SUCCESS, timestamp)
        this.slackService.sendText(message);
        return process.env.UPDATE_SUCCESS;
    }

}