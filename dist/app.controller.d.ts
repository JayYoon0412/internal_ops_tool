import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getUploadPage(): {};
    uploadFile(file: any): Promise<{
        message: string;
    }>;
    downloadOutput(res: any): Promise<{
        message: string;
    }>;
}
