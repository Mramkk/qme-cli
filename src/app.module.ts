import { Module } from "@nestjs/common";
import { CliModule } from "./cli/cli.module";
import { ConfigModule } from "./config/config.module";
import { GitModule } from "./git/git.module";
import { SystemModule } from "./system/system.module";

@Module({
  imports: [ConfigModule, GitModule, SystemModule, CliModule],
})
export class AppModule {}
