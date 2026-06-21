import { Migration } from "@mikro-orm/migrations";

export class Migration202606210001_AddAutoCashoutToBets extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table bets
        add column if not exists auto_cashout_multiplier_bps integer null,
        add column if not exists cashout_trigger text null;
    `);

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'bets_auto_cashout_multiplier_bounds'
        ) then
          alter table bets
            add constraint bets_auto_cashout_multiplier_bounds
            check (
              auto_cashout_multiplier_bps is null
              or (auto_cashout_multiplier_bps between 11000 and 1000000)
            );
        end if;
      end $$;
    `);

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'bets_cashout_trigger_known'
        ) then
          alter table bets
            add constraint bets_cashout_trigger_known
            check (
              cashout_trigger is null
              or cashout_trigger in ('manual', 'auto')
            );
        end if;
      end $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql("alter table bets drop constraint if exists bets_cashout_trigger_known;");
    this.addSql("alter table bets drop constraint if exists bets_auto_cashout_multiplier_bounds;");
    this.addSql("alter table bets drop column if exists cashout_trigger;");
    this.addSql("alter table bets drop column if exists auto_cashout_multiplier_bps;");
  }
}
