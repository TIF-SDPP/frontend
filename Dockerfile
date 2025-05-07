FROM node:23-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar todo y construir la app
COPY . .
RUN npm run build

# Instalar el servidor de archivos estáticos
RUN npm install -g serve

# Exponer el puerto que serve usará
EXPOSE 8080

# Servir la app desde la carpeta dist o build (según el framework)
CMD ["serve", "-s", "dist", "-l", "8080"]

# # Etapa 1: build
# FROM node:23-alpine as builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Etapa 2: producción con nginx
# FROM nginx:alpine
# COPY --from=builder /app/dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

