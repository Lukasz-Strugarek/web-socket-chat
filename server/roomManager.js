const userManager = require('./userManager');

const rooms      = new Map();
const userRooms  = new Map();

(function init() {
  createRoom('main');
})();

function createRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    return true;
  }
  return false;
}

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

function removeUserFromRoom(socketId, roomName) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).delete(socketId);
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

function roomExists(roomName) {
  return rooms.has(roomName);
}

function getUserRooms(socketId) {
  return Array.from(userRooms.get(socketId) || []);
}

function getUsersInRoom(roomName) {
  if (!rooms.has(roomName)) return [];
  return Array.from(rooms.get(roomName))
    .map(id => userManager.getUser(id))
    .filter(u => u);
}

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
