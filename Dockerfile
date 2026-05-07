# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", ".output/server/index.mjs"]