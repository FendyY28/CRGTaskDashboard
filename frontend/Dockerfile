# TAHAP 1: Build React/Vite
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build aplikasi Vite menjadi folder 'dist'
RUN npm run build

# TAHAP 2: Serve dengan Nginx (Web Server)
FROM nginx:alpine
# Salin hasil build dari Tahap 1 ke dalam folder Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Buka port 80 (Standar web)
EXPOSE 80

# Jalankan Nginx
CMD ["nginx", "-g", "daemon off;"]