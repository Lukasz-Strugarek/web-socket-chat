const express = require('express');
const http = require('http');
const path = require('path');
const { initChatServer } = require('./server/chatServer');

// Inicjalizacja Express
const app = express();
const server = http.createServer(app);

// Serwowanie plików statycznych
app.use(express.static(path.join(__dirname, 'public')));

// Inicjalizacja serwera czatu
initChatServer(server);

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serwer uruchomiony na porcie ${PORT}`);
});
