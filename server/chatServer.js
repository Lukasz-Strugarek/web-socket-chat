// server/chatServer.js

const socketIO    = require('socket.io');
const userManager = require('./userManager');
const roomManager = require('./roomManager');

function initChatServer(server) {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET","POST"]
    },
    maxHttpBufferSize: 5e6
  });

  io.on('connection', socket => {
    console.log('Nowe połączenie:', socket.id);

    // Rejestracja
    socket.on('register', ({ username, room }) => {
      if (userManager.isUsernameTaken(username)) {
        socket.emit('error', { message: 'Nick jest już zajęty' });
        return;
      }
      const user     = userManager.addUser(socket.id, username);
      const roomName = room || 'main';

      socket.join(roomName);
      roomManager.addUserToRoom(socket.id, roomName);

      // Wyślij potwierdzenie do usera
      socket.emit('registered', {
        user,
        room: roomName,
        users: roomManager.getUsersInRoom(roomName),
        availableRooms: roomManager.getAvailableRooms()
      });

      // Powiadom innych w pokoju i prześlij zaktualizowaną listę
      const usersInRoom = roomManager.getUsersInRoom(roomName);
      socket.to(roomName).emit('user_joined', {
        user,
        message: `${username} dołączył do pokoju`,
        users: usersInRoom
      });

      io.emit('rooms_update', roomManager.getAvailableRooms());
    });

    // Wysyłanie tekstu
    socket.on('send_message', ({ text, room }) => {
      const user = userManager.getUser(socket.id);
      if (!user || !room) return;
      const message = {
        id: Date.now().toString(),
        user,
        text,
        timestamp: new Date().toISOString(),
        hasImage: false
      };
      io.to(room).emit('new_message', message);
    });

    // Wysyłanie obrazu
    socket.on('send_image', ({ text, image, room }) => {
      const user = userManager.getUser(socket.id);
      if (!user || !room) return;
      const message = {
        id: Date.now().toString(),
        user,
        text: text || '',
        timestamp: new Date().toISOString(),
        hasImage: true,
        imageData: image
      };
      io.to(room).emit('new_message', message);
    });

    // Typing...
    socket.on('typing', ({ room }) => {
      const user = userManager.getUser(socket.id);
      if (!user || !room) return;
      socket.to(room).emit('user_typing', { user: user.username });
    });
    socket.on('stop_typing', ({ room }) => {
      const user = userManager.getUser(socket.id);
      if (!user || !room) return;
      socket.to(room).emit('user_stop_typing', { user: user.username });
    });

    // Dołącz / przełącz pokój
    socket.on('join_room', roomName => {
      const user = userManager.getUser(socket.id);
      if (!user || !roomManager.roomExists(roomName)) return;
      const already = roomManager.getUserRooms(socket.id).includes(roomName);

      if (!already) {
        socket.join(roomName);
        roomManager.addUserToRoom(socket.id, roomName);

        const usersInRoom = roomManager.getUsersInRoom(roomName);
        socket.to(roomName).emit('user_joined', {
          user,
          message: `${user.username} dołączył do pokoju`,
          users: usersInRoom
        });

        io.emit('rooms_update', roomManager.getAvailableRooms());
      }

      socket.emit('room_joined', {
        room: roomName,
        users: roomManager.getUsersInRoom(roomName)
      });
    });

    // Opuść pokój
    socket.on('leave_room', ({ room }) => {
      const user = userManager.getUser(socket.id);
      if (!user || !room) return;

      roomManager.removeUserFromRoom(socket.id, room);
      socket.leave(room);

      const usersInRoom = roomManager.getUsersInRoom(room);
      socket.to(room).emit('user_left', {
        user,
        message: `${user.username} opuścił pokój`,
        users: usersInRoom
      });

      socket.emit('room_left', { room });
      io.emit('rooms_update', roomManager.getAvailableRooms());
    });

    // Rozłączenie
    socket.on('disconnect', () => {
      const user = userManager.getUser(socket.id);
      if (!user) return;

      const userRooms = roomManager.getUserRooms(socket.id);
      userRooms.forEach(r => {
        roomManager.removeUserFromRoom(socket.id, r);
        const usersInRoom = roomManager.getUsersInRoom(r);
        socket.to(r).emit('user_left', {
          user,
          message: `${user.username} opuścił pokój`,
          users: usersInRoom
        });
      });

      userManager.removeUser(socket.id);
      io.emit('rooms_update', roomManager.getAvailableRooms());
      console.log(`Rozłączono: ${user.username} (${socket.id})`);
    });
  });

  return io;
}

module.exports = { initChatServer };
