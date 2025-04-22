const socketIO = require('socket.io');
const userManager = require('./userManager');
const roomManager = require('./roomManager');
const fs = require('fs');
const path = require('path');

function initChatServer(server) {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 5e6 // 5MB max dla uploadów zdjęć
  });

  // Obsługa podłączenia klienta
  io.on('connection', (socket) => {
    console.log('Nowe połączenie:', socket.id);
    
    // Rejestracja użytkownika
    socket.on('register', ({ username, room }) => {
      const user = userManager.addUser(socket.id, username);
      
      // Dołączanie do pokoju (domyślny pokój to 'main')
      const roomName = room || 'main';
      socket.join(roomName);
      roomManager.addUserToRoom(socket.id, roomName);
      
      // Powiadomienie o nowym użytkowniku
      socket.emit('registered', { 
        user,
        room: roomName,
        users: userManager.getUsersInRoom(roomName),
        availableRooms: roomManager.getAvailableRooms()
      });
      
      // Powiadomienie pozostałych użytkowników w pokoju
      socket.to(roomName).emit('user_joined', {
        user,
        message: `${username} dołączył do pokoju`
      });
      
      // Aktualizacja listy dostępnych pokojów
      io.emit('rooms_update', roomManager.getAvailableRooms());
    });
    
    // Obsługa wiadomości
    socket.on('send_message', (data) => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const roomName = roomManager.getUserRoom(socket.id);
      if (!roomName) return;
      
      const messageData = {
        id: Date.now().toString(),
        user: user,
        text: data.text,
        timestamp: new Date().toISOString(),
        hasImage: false
      };
      
      // Emisja wiadomości do wszystkich w pokoju
      io.to(roomName).emit('new_message', messageData);
    });
    
    // Obsługa przesyłania zdjęć
    socket.on('send_image', (data) => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const roomName = roomManager.getUserRoom(socket.id);
      if (!roomName) return;
      
      const messageData = {
        id: Date.now().toString(),
        user: user,
        text: data.text || '',
        timestamp: new Date().toISOString(),
        hasImage: true,
        imageData: data.image
      };
      
      // Emisja wiadomości ze zdjęciem do wszystkich w pokoju
      io.to(roomName).emit('new_message', messageData);
    });
    
    // Obsługa "użytkownik pisze..."
    socket.on('typing', () => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const roomName = roomManager.getUserRoom(socket.id);
      if (!roomName) return;
      
      socket.to(roomName).emit('user_typing', { user: user.username });
    });
    
    // Obsługa "użytkownik przestał pisać..."
    socket.on('stop_typing', () => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const roomName = roomManager.getUserRoom(socket.id);
      if (!roomName) return;
      
      socket.to(roomName).emit('user_stop_typing', { user: user.username });
    });
    
    // Obsługa zmiany pokoju
    socket.on('join_room', (roomName) => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const currentRoom = roomManager.getUserRoom(socket.id);
      if (currentRoom === roomName) return;
      
      // Opuszczenie poprzedniego pokoju
      if (currentRoom) {
        socket.leave(currentRoom);
        roomManager.removeUserFromRoom(socket.id, currentRoom);
        socket.to(currentRoom).emit('user_left', {
          user,
          message: `${user.username} opuścił pokój`
        });
      }
      
      // Dołączenie do nowego pokoju
      socket.join(roomName);
      roomManager.addUserToRoom(socket.id, roomName);
      
      // Powiadomienie użytkownika o zmianie pokoju
      socket.emit('room_joined', {
        room: roomName,
        users: userManager.getUsersInRoom(roomName)
      });
      
      // Powiadomienie pozostałych użytkowników w nowym pokoju
      socket.to(roomName).emit('user_joined', {
        user,
        message: `${user.username} dołączył do pokoju`
      });
      
      // Aktualizacja listy dostępnych pokojów
      io.emit('rooms_update', roomManager.getAvailableRooms());
    });
    
    // Obsługa utworzenia nowego pokoju
    socket.on('create_room', (roomName) => {
      if (roomManager.roomExists(roomName)) {
        socket.emit('error', { message: `Pokój ${roomName} już istnieje` });
        return;
      }
      
      roomManager.createRoom(roomName);
      io.emit('rooms_update', roomManager.getAvailableRooms());
      socket.emit('room_created', { room: roomName });
    });
    
    // Obsługa rozłączenia
    socket.on('disconnect', () => {
      const user = userManager.getUser(socket.id);
      if (!user) return;
      
      const roomName = roomManager.getUserRoom(socket.id);
      if (roomName) {
        roomManager.removeUserFromRoom(socket.id, roomName);
        socket.to(roomName).emit('user_left', {
          user,
          message: `${user.username} opuścił pokój`
        });
      }
      
      userManager.removeUser(socket.id);
      io.emit('rooms_update', roomManager.getAvailableRooms());
      console.log(`Użytkownik rozłączony: ${user.username} (${socket.id})`);
    });
  });

  return io;
}

module.exports = {
  initChatServer
};