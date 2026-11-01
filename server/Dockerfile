FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies (supports builds with or without package-lock.json)
RUN npm install --omit=dev --no-audit

# Copy application files
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
