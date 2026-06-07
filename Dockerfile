# Use Playwright base image (already includes Node)
#FROM mcr.microsoft.com/playwright:focal
# Use the official lightweight Playwright Linux environment
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

#RUN apt-get update && apt-get install -y wget gnupg && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' > /etc/apt/sources.list.d/google.list && apt-get update && apt-get install -y google-chrome-stable
# does not run in Render.com
#RUN npm ci

# Install dependencies
RUN npm install

# Install chromium for playwright
RUN npx  playwright install chromium


# Copy ALL project files
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "app.js"]
