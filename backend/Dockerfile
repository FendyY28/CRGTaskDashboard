# Use lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build and start the backend
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]