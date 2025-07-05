# Admin Dockerfile - Vue 3 Admin Dashboard
FROM node:20-alpine

# Install git and wget for npm dependencies and health checks
RUN apk add --no-cache git wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Vue application (skip type generation in Docker)
RUN npm run build:prod

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start admin server
CMD ["npm", "start"]