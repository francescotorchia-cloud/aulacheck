FROM node:24-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ .
COPY frontend/ ../frontend

EXPOSE 3000

CMD ["node", "index.js"]