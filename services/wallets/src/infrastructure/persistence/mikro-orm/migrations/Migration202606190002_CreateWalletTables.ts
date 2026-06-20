import { Migration } from "@mikro-orm/migrations";

export class Migration202606190002_CreateWalletTables extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists wallets (
        id varchar(128) primary key,
        player_id varchar(255) not null unique,
        balance_cents integer not null default 0 check (balance_cents >= 0),
        version integer not null default 1,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    this.addSql(`
      create table if not exists wallet_operations (
        id varchar(128) primary key,
        idempotency_key varchar(255) not null unique,
        wallet_id varchar(128) not null references wallets(id) on delete cascade,
        type varchar(32) not null check (type in ('debit_bet', 'credit_payout', 'seed_credit')),
        amount_cents integer not null check (amount_cents >= 0),
        status varchar(32) not null check (status in ('accepted', 'rejected')),
        reason varchar(255) null,
        source_round_id varchar(128) null,
        source_bet_id varchar(128) null,
        created_at timestamptz not null default now()
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql("drop table if exists wallet_operations;");
    this.addSql("drop table if exists wallets;");
  }
}
