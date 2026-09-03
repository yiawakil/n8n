# ==========================================
# Stage 1: Build the enhanced ERPNext node
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install esbuild for ultra-fast, low-memory transpilation
RUN npm install -g esbuild

# Copy ERPNext node source and credentials
COPY packages/nodes-base/nodes/ERPNext ./nodes/ERPNext
COPY packages/nodes-base/credentials/ERPNextApi.credentials.ts ./credentials/ERPNextApi.credentials.ts

# Compile TypeScript to CommonJS
RUN esbuild ./nodes/ERPNext/ERPNext.node.ts \
            ./nodes/ERPNext/DocumentDescription.ts \
            ./nodes/ERPNext/GenericFunctions.ts \
            ./nodes/ERPNext/utils.ts \
            --outdir=./dist/nodes/ERPNext \
            --format=cjs \
            --platform=node

RUN esbuild ./credentials/ERPNextApi.credentials.ts \
            --outdir=./dist/credentials \
            --format=cjs \
            --platform=node

# Copy static assets (json, svg)
RUN cp ./nodes/ERPNext/*.json ./dist/nodes/ERPNext/ && \
    cp ./nodes/ERPNext/*.svg ./dist/nodes/ERPNext/

# ==========================================
# Stage 2: Official n8n runtime with injected node
# ==========================================
FROM n8nio/n8n:latest

USER root

# Copy compiled ERPNext node into n8n-nodes-base
COPY --from=builder /app/dist/nodes/ERPNext/ /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/ERPNext/
COPY --from=builder /app/dist/credentials/ /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/credentials/

# Set up permissions
RUN chown -R node:node /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/ERPNext \
                       /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/credentials/ERPNextApi.credentials.js \
                       /home/node/.n8n

USER node

ENV PORT=5678
ENV N8N_PORT=5678
ENV NODE_ENV=production

EXPOSE 5678
CMD ["n8n", "start"]
