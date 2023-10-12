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
import * as schedule from 'node-schedule';

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

    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = [0, new schedule.Range(2,4)];
    rule.hour = 17;
    rule.minute = [5, 6, 7];
    rule.tz = 'Asia/Seoul';
    schedule.scheduleJob(rule, function() {
      const date = Date.now();
      console.log(`[${date}] 자동작업 테스팅 확인`);
    })
    
  }

  //엑셀 파일 업로드하고 버튼 누르면 [상품 Id, 재고수량] 맵으로 가능
  //만약 키 중 수량이 x보다 크면 태그 부여 [태그 부여된 상품 id 리스트] 생성
  //기존 리스트 업데이트
  //파센 작업 API로 대체 => 상품 진열/미진열, 그 외 로직
  
}
