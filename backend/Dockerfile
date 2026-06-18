# Build context = repo root (see infra/docker-compose.yml and infra/railway.json).
# We need access to both backend/ and content/ in one image.

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# argon2 native bindings need build deps
RUN apk add --no-cache python3 make g++

COPY backend/package.json backend/package-lock.json* ./
RUN npm install

COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++ \
    && addgroup -S app && adduser -S app -G app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev && apk del python3 make g++

COPY --from=build /app/dist ./dist

# Bake content into the image so seed.ts can find it at /app/content
COPY content ./content

USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
