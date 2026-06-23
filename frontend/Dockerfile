FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build-storybook

EXPOSE 3000

CMD ["bun", "run", "dev"]
