# Menggunakan Node.js versi 18 (Alpine lebih ringan)
FROM node:18-alpine

# Set folder kerja di dalam container Docker
WORKDIR /app

# Salin file package.json dan install dependency
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Salin seluruh kode backend Anda ke dalam container
COPY . .

# Generate Prisma Client (Wajib untuk database)
RUN npx prisma generate

# Build aplikasi NestJS menjadi JavaScript siap pakai
RUN npm run build

# Buka port 3000 agar bisa diakses
EXPOSE 3000

# Perintah untuk menjalankan aplikasi saat container menyala
CMD ["npm", "run", "start:prod"]