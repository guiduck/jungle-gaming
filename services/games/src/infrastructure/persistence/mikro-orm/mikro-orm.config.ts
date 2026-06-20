import { Options } from "@mikro-orm/postgresql";
import { betSchema, gameMessageReceiptSchema, roundSchema } from "./schema";

const config: Options = {
  entities: [roundSchema, betSchema, gameMessageReceiptSchema],
  dbName: process.env.GAMES_DB_NAME ?? "games",
  host: process.env.POSTGRES_HOST ?? "postgres",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "admin",
  password: process.env.POSTGRES_PASSWORD ?? "admin",
  migrations: {
    path: "dist/infrastructure/persistence/mikro-orm/migrations",
    pathTs: "src/infrastructure/persistence/mikro-orm/migrations",
  },
};

export default config;
