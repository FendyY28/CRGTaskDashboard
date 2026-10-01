# Use lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate the Prisma client before compiling NestJS.
# .env is excluded via .dockerignore, so DATABASE_URL is supplied as a build
# arg. Prisma only needs a syntactically valid URL at generate time; the real
# value is injected at runtime by docker-compose.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bsi_crg_db?schema=public
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
# Build and start the backend
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]