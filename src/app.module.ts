import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SellerModule } from './apis/seller/seller.module';
import { FileModule } from './apis/file/file.module';
import { DeliveryModule } from './apis/delivery/delivery.module';
import { DeliveryService } from './apis/delivery/delivery.service';
import { FileService } from './apis/file/file.service';
import { SlackModule } from 'nestjs-slack';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import { registerPartials } from './commons/partials';
import { LogGateway } from './apis/log/log.gateway';
import { DashboardTransport } from './apis/log/log.transport';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'src/commons/graphql/schema.gql',
      context: ({ req, res }) => ({ req, res }),
    }),
    SlackModule.forRoot({
      type: 'webhook',
      url: process.env.WEBHOOK_LINK
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('OpsTool', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
        new DashboardTransport()
      ],
    }),
    SellerModule,
    FileModule,
    DeliveryModule,
  ],
  controllers: [AppController],
  providers: [AppService, DeliveryService, FileService, LogGateway],
})
export class AppModule {
  constructor() {
    registerPartials();
  }
}
