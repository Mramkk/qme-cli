import { Controller, Get } from "@nestjs/common";
import { CliService } from "./cli.service";

@Controller("cli")
export class CliController {
  constructor(private readonly cliService: CliService) {}

  @Get("status")
  status(): { ok: true; message: string } {
    return { ok: true, message: this.cliService.getStatus() };
  }
}
