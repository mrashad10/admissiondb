FROM node:16

RUN apt update && apt install -y sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD [ "node", "index.js" ]
