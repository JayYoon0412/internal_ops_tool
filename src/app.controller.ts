import { Controller, Get, Post, Redirect, Render, Response, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('upload')
  @Render('upload')
  getUploadPage() {
    return {};
  }

  @Post('upload')
  @Render('download')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    const filePath = file.path;
    await this.appService.scrape(filePath);
    return { message: 'Scraping completed successfully!' };
  }

  @Get('download')
  async downloadOutput(@Response() res: any) {
    await this.appService.downloadCsvFile(res);
    return { message: 'Download Complete!' };
  }
}
