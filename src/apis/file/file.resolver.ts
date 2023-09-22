import { Query, Resolver } from "@nestjs/graphql";
import { FileService } from "./file.service";

@Resolver()
export class FileResolver {
    constructor(
        private readonly fileService: FileService
    ) {}

    @Query(() => String)
    loadDocs() {
        return this.fileService.loadDocs();
    }
    
}