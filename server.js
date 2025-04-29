const express = require('express');
const http = require('http');
const path = require('path');
const { initChatServer } = require('./server/chatServer');

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

initChatServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serwer uruchomiony na porcie ${PORT}`);
});
