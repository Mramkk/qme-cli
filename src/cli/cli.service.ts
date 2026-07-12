import { Injectable } from "@nestjs/common";

@Injectable()
export class CliService {
  getStatus(): string {
    return "NestJS scaffold is ready for command migration.";
  }
}
