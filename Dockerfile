# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
# Only copy lock files if they exist to avoid build failure
COPY bun.lockb* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
# We set NITRO_PRESET=node-server to ensure compatibility with Cloud Run
RUN NITRO_PRESET=node-server npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output

# Expose port (Cloud Run defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", ".output/server/index.mjs"]