# Stage 1: Build
FROM node:20-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy app source
COPY . .

# Build TypeScript files
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Install dependencies required for Puppeteer and healthcheck
RUN apt-get update \
    && apt-get install -y wget gnupg curl \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser

# Create app directory and set permissions
WORKDIR /usr/src/app
RUN chown -R pptruser:pptruser /usr/src/app

# Copy built files from builder stage
COPY --from=builder --chown=pptruser:pptruser /usr/src/app/package*.json ./
COPY --from=builder --chown=pptruser:pptruser /usr/src/app/dist ./dist

# Install production dependencies only
RUN npm ci --only=production

# Switch to non-root user
USER pptruser

# Set Node.js to run in production mode
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Create a healthcheck that doesn't depend on TMDB
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/manifest.json || exit 1

# Start the application
CMD ["npm", "start"]
