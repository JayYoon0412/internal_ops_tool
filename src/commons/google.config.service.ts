import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class GoogleSheetConfigService {
  private readonly credentials: any;

  constructor() {
    const credentialsPath = '../../google_spread_key.json';
    this.credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  }

  getCredentials(): any {
    return this.credentials;
  }
}
