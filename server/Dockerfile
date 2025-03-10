# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma Client
RUN npx prisma generate

# Set environment variables
ENV PORT=8080

# Expose the port your app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
