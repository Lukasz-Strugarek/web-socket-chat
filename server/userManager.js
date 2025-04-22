const users = new Map();

// Dodawanie użytkownika
function addUser(socketId, username) {
  const user = {
    id: socketId,
    username
  };
  
  users.set(socketId, user);
  return user;
}

// Pobieranie użytkownika
function getUser(socketId) {
  return users.get(socketId);
}

// Usuwanie użytkownika
function removeUser(socketId) {
  if (users.has(socketId)) {
    const user = users.get(socketId);
    users.delete(socketId);
    return user;
  }
  return null;
}

// Pobieranie wszystkich użytkowników
function getAllUsers() {
  return Array.from(users.values());
}

// Pobieranie użytkowników w pokoju
function getUsersInRoom(roomName) {
  const roomUsers = [];
  
  // Ta funkcja będzie współpracować z roomManager
  // Tutaj zbieramy tylko dane użytkowników, ale informacja o pokojach
  // będzie zarządzana przez roomManager
  
  return roomUsers;
}

// Sprawdzanie czy nick jest zajęty
function isUsernameTaken(username) {
  for (const user of users.values()) {
    if (user.username.toLowerCase() === username.toLowerCase()) {
      return true;
    }
  }
  return false;
}

module.exports = {
  addUser,
  getUser,
  removeUser,
  getAllUsers,
  getUsersInRoom,
  isUsernameTaken
};