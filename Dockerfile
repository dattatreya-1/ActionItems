### Build stage
FROM node:18 AS build
WORKDIR /app

# Install deps and build frontend
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
RUN test -f dist/index.html || (echo "dist/index.html not found — build failed" && exit 1)

### Production image
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy build output and server
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/server/index.js ./server/index.js
COPY --from=build /app/src ./src

EXPOSE ${PORT}

CMD ["node", "server/index.js"]
