import { Module } from "@nestjs/common";
import { FileService } from "./file.service";
import { FileResolver } from "./file.resolver";
import { SlackModule, SlackService } from "nestjs-slack";

@Module({
    imports: [SlackModule.forRoot({
      type: 'webhook',
      url: process.env.WEBHOOK_LINK_2
    }),],
    providers: [FileService, FileResolver, SlackService]
})
export class FileModule {}