// server/roomManager.js

const userManager = require('./userManager');

// Mapa: nazwa pokoju → Set<socketId>
const rooms      = new Map();
// Mapa: socketId → Set<pokój>
const userRooms  = new Map();

// Inicjalizacja domyślnego pokoju
(function init() {
  createRoom('main');
})();

// Utworzenie nowego pokoju
function createRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    return true;
  }
  return false;
}

// Dodanie użytkownika do pokoju
function addUserToRoom(socketId, roomName) {
  if (!rooms.has(roomName)) {
    createRoom(roomName);
  }
  rooms.get(roomName).add(socketId);
  if (!userRooms.has(socketId)) {
    userRooms.set(socketId, new Set());
  }
  userRooms.get(socketId).add(roomName);
}

// Usunięcie użytkownika z pokoju
function removeUserFromRoom(socketId, roomName) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).delete(socketId);
    // Jeśli pokój jest pusty i nie main, usuń go
    if (rooms.get(roomName).size === 0 && roomName !== 'main') {
      rooms.delete(roomName);
    }
  }
  if (userRooms.has(socketId)) {
    const set = userRooms.get(socketId);
    set.delete(roomName);
    if (set.size === 0) {
      userRooms.delete(socketId);
    }
  }
}

// Sprawdzenie czy pokój istnieje
function roomExists(roomName) {
  return rooms.has(roomName);
}

// Pobranie listy pokoi, do których należy użytkownik
function getUserRooms(socketId) {
  return Array.from(userRooms.get(socketId) || []);
}

// Pobranie użytkowników w danym pokoju
function getUsersInRoom(roomName) {
  if (!rooms.has(roomName)) return [];
  return Array.from(rooms.get(roomName))
    .map(id => userManager.getUser(id))
    .filter(u => u);
}

// Lista wszystkich pokoi i rozmiarów
function getAvailableRooms() {
  const available = [];
  for (const [name, set] of rooms.entries()) {
    available.push({ name, users: set.size });
  }
  return available;
}

module.exports = {
  createRoom,
  addUserToRoom,
  removeUserFromRoom,
  roomExists,
  getUserRooms,
  getUsersInRoom,
  getAvailableRooms
};
