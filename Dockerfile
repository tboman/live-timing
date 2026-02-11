# Use a Node.js 20 Alpine image as the base for building
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN pnpm build

# Use a Node.js 20 Alpine image as the base for running
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables for Next.js production
ENV NODE_ENV=production

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Install pnpm globally in the runner stage as well
RUN npm install -g pnpm

# Set the PORT environment variable to 8080 for Cloud Run
ENV PORT 8080

# Command to run the application, explicitly using the PORT environment variable

CMD sh -c "pnpm start -p $PORT"
