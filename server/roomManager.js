const userManager = require('./userManager');

// Struktura pokojów
const rooms = new Map();
// Mapowanie użytkownik -> pokój
const userRooms = new Map();

// Inicjalizacja domyślnego pokoju
function init() {
  createRoom('main');
}

// Utworzenie nowego pokoju
function createRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    return true;
  }
  return false;
}

// Dodawanie użytkownika do pokoju
function addUserToRoom(socketId, roomName) {
  if (!rooms.has(roomName)) {
    createRoom(roomName);
  }
  
  // Dodaj użytkownika do pokoju
  rooms.get(roomName).add(socketId);
  // Zapisz informację o pokoju użytkownika
  userRooms.set(socketId, roomName);
}

// Usunięcie użytkownika z pokoju
function removeUserFromRoom(socketId, roomName) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).delete(socketId);
    userRooms.delete(socketId);
    
    // Jeśli pokój jest pusty i nie jest głównym pokojem, usuń go
    if (rooms.get(roomName).size === 0 && roomName !== 'main') {
      rooms.delete(roomName);
    }
  }
}

// Sprawdzenie czy pokój istnieje
function roomExists(roomName) {
  return rooms.has(roomName);
}

// Pobranie pokoju użytkownika
function getUserRoom(socketId) {
  return userRooms.get(socketId);
}

// Pobranie wszystkich użytkowników w pokoju
function getUsersInRoom(roomName) {
  if (!rooms.has(roomName)) {
    return [];
  }
  
  const userIds = Array.from(rooms.get(roomName));
  return userIds.map(id => userManager.getUser(id)).filter(user => user !== undefined);
}

// Pobranie listy dostępnych pokojów
function getAvailableRooms() {
  const availableRooms = [];
  
  for (const [roomName, users] of rooms.entries()) {
    availableRooms.push({
      name: roomName,
      users: users.size
    });
  }
  
  return availableRooms;
}

// Inicjalizacja domyślnego pokoju
init();

module.exports = {
  createRoom,
  addUserToRoom,
  removeUserFromRoom,
  roomExists,
  getUserRoom,
  getUsersInRoom,
  getAvailableRooms
};