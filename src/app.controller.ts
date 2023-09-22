import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  Response,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeliveryService } from './apis/delivery/delivery.service';
import { FileService } from './apis/file/file.service';

export class SheetTrackerDto {
  seller: any;
  check: any;
  returns: any;
  oos: any;
  partialOB: any;
  totalOB: any;
  userCancel: any;
  oosCancel: any;
  date: any;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly deliveryService: DeliveryService,
    private readonly fileService: FileService,
  ) {}

  @Get('dashboard')
  @Render('dashboard')
  getAdminPage() {
    return {};
  }

  @Get('login')
  @Render('login')
  getLoginPage() {
    return {};
  }

  @Get('upload')
  @Render('upload')
  getUploadPage() {
    return {};
  }

  @Get('requestDelivery')
  async requestDomestic(@Response() res: any) {
    await this.deliveryService.requestDomestic();
    return {};
  }

  @Post('updateSheet')
  updateDailyTrackingSheet(@Body() args: SheetTrackerDto) {
    return this.fileService.insertRow({ rowDto: args });
  }

  @Post('sheetLoad')
  async loadDailyTrackingSheet() {
    return await this.fileService.loadDocs();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Response() res: any) {
    const filePath = file.path;
    await this.deliveryService.cancelCBU({ filePath });
    return {};
  }

  @Get('download')
  async downloadOutput(@Response() res: any) {
    await this.appService.downloadCsvFile(res);
    return {};
  }

  @Get('test')
  async loginTest() {
    return await this.appService.test();
  }

  @Get('redash/sellercontact')
  @Render('sellercontact')
  getContactPage() {
    return {};
  }

  // @Post('redash/sellercontact')
  // @Render('download')
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadSellerContactFile(@UploadedFile() file: any) {
  //   await this.appService.scrapeContacts();
  //   return { message: 'Scraping completed: Seller Email and Mobile Number From CS Site'};
  // }
}
