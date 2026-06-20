import { Options } from "@mikro-orm/postgresql";
import { walletOperationSchema, walletSchema } from "./schema";

const config: Options = {
  entities: [walletSchema, walletOperationSchema],
  dbName: process.env.WALLETS_DB_NAME ?? "wallets",
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
