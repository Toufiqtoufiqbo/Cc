# Base Node image for enterprise applications
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Builder stage
FROM base AS builder
RUN npm ci
COPY . .
# We use Vite to build the frontend and esbuild to bundle the server
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
# Run the compiled, self-contained server
CMD ["npm", "start"]
