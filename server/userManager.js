// server/userManager.js

const users = new Map();

// Dodawanie użytkownika
function addUser(socketId, username) {
  const user = { id: socketId, username };
  users.set(socketId, user);
  return user;
}

// Pobranie użytkownika
function getUser(socketId) {
  return users.get(socketId);
}

// Usunięcie użytkownika
function removeUser(socketId) {
  const user = users.get(socketId);
  users.delete(socketId);
  return user;
}

// Pobranie wszystkich użytkowników
function getAllUsers() {
  return Array.from(users.values());
}

// Sprawdzenie, czy nazwa jest zajęta
function isUsernameTaken(username) {
  for (const u of users.values()) {
    if (u.username.toLowerCase() === username.toLowerCase()) {
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
  isUsernameTaken
};
