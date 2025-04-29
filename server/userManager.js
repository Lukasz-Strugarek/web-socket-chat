const users = new Map();

function addUser(socketId, username) {
  const user = { id: socketId, username };
  users.set(socketId, user);
  return user;
}

function getUser(socketId) {
  return users.get(socketId);
}

function removeUser(socketId) {
  const user = users.get(socketId);
  users.delete(socketId);
  return user;
}

function getAllUsers() {
  return Array.from(users.values());
}

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
