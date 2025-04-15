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

# Copy fix in MCP code
COPY ./sse_cjs.js ./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/sse.js
COPY ./sse_esm.js ./node_modules/@modelcontextprotocol/sdk/dist/esm/server/sse.js

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3004

# Run the server
CMD ["node", "dist/index.js"]