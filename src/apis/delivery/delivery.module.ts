import { Module } from '@nestjs/common';
import { DeliveryResolver } from './delivery.resolver';
import { DeliveryService } from './delivery.service';
import { SlackModule, SlackService } from 'nestjs-slack';

@Module({
  imports: [
    SlackModule.forRoot({
      type: 'webhook',
      url: process.env.WEBHOOK_LINK
    }),
  ],
  providers: [DeliveryResolver, DeliveryService, SlackService],
})
export class DeliveryModule {}
