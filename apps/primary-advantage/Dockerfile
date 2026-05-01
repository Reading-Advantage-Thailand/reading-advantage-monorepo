# Use the official Node.js 20 Alpine image for smaller size
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma client and run Next.js build
# DATABASE_URL is needed during build for Prisma client generation
# It will be provided via Cloud Build's secretEnv or substitutions
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npm run prisma:generate && npm run build



# Use a smaller image for production deployment
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment variables for Next.js production
ENV NODE_ENV=production
# Set host to 0.0.0.0 for Cloud Run
ENV HOSTNAME="0.0.0.0"
# Set port to 3000 for Cloud Run
ENV PORT=3000

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy Prisma schema and generated client for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy data directory containing JSON prompt files
COPY --from=builder /app/data ./data

# Expose the port
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "run", "start"]