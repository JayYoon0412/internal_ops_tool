import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerResolver } from './seller.resolver';

@Module({
  imports: [],
  providers: [SellerService, SellerResolver],
})
export class SellerModule {}
