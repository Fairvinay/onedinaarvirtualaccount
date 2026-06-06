# Use Playwright base image (already includes Node)
FROM mcr.microsoft.com/playwright:focal

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install chromium for playwright
RUN npx  playwright install chromium
RUN npx puppeteer browsers install chrome

# Copy ALL project files
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "app.js"]
