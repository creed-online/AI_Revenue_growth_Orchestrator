# ── Production Backend Dockerfile ──
FROM node:20-alpine AS base

WORKDIR /app

# Install openssl for Prisma engines
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./
COPY ../prisma ./prisma/

# Install all dependencies (including tsx for running server)
RUN npm ci

# Copy backend source
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
