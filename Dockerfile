FROM node:20-bookworm-slim
WORKDIR /app
# build deps for native modules (better-sqlite3 falls back to source if no prebuild)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node","src/app.js"]
