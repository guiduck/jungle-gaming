import { Migration } from "@mikro-orm/migrations";

export class Migration202606190001_CreateGameTables extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists rounds (
        id varchar(128) primary key,
        status varchar(32) not null,
        betting_opens_at timestamptz null,
        betting_closes_at timestamptz null,
        started_at timestamptz null,
        crashed_at timestamptz null,
        settled_at timestamptz null,
        crash_multiplier_bps integer not null,
        house_edge_bps integer not null default 100,
        server_seed_hash varchar(128) not null,
        server_seed varchar(255) null,
        nonce varchar(128) not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    this.addSql(`
      create table if not exists bets (
        id varchar(128) primary key,
        round_id varchar(128) not null references rounds(id) on delete cascade,
        player_id varchar(255) not null,
        amount_cents integer not null check (amount_cents > 0),
        status varchar(32) not null,
        cashout_multiplier_bps integer null,
        payout_cents integer null,
        wallet_operation_key varchar(255) not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    this.addSql(`
      create unique index if not exists bets_round_player_unique
      on bets(round_id, player_id);
    `);

    this.addSql(`
      create table if not exists game_message_receipts (
        idempotency_key varchar(255) primary key,
        message_type varchar(128) not null,
        processed_at timestamptz not null default now()
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql("drop table if exists game_message_receipts;");
    this.addSql("drop table if exists bets;");
    this.addSql("drop table if exists rounds;");
  }
}
