FROM node:18-alpine

WORKDIR /maps-mcp-server

# Copy package files
COPY package*.json ./

# Copy compiler options
COPY tsconfig.json ./

# Copy source code
COPY ./src ./src

# Build TypeScript to JavaScript
RUN npm install

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3004

# Run the server
CMD ["node", "run start"]