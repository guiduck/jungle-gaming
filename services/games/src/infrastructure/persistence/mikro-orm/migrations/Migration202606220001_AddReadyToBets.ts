import { Migration } from "@mikro-orm/migrations";

export class Migration202606220001_AddReadyToBets extends Migration {
  override async up(): Promise<void> {
    this.addSql("alter table bets add column if not exists ready boolean not null default false;");
  }

  override async down(): Promise<void> {
    this.addSql("alter table bets drop column if exists ready;");
  }
}
