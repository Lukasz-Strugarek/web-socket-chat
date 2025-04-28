// public/js/client.js

// Połączenie Socket.IO
const socket = io();

// Elementy DOM
const loginContainer     = document.getElementById('login-container');
const chatContainer      = document.getElementById('chat-container');
const loginForm          = document.getElementById('login-form');
const chatForm           = document.getElementById('chat-form');
const messageInput       = document.getElementById('message');
const messagesContainer  = document.getElementById('messages');
const usersList          = document.getElementById('users');
const roomsList          = document.getElementById('rooms');
const currentRoomElement = document.getElementById('current-room');
const createRoomBtn      = document.getElementById('create-room-btn');
const newRoomInput       = document.getElementById('new-room');
const typingIndicator    = document.getElementById('typing-indicator');
const imageUpload        = document.getElementById('image-upload');
const imagePreview       = document.getElementById('image-preview');
const previewImg         = document.getElementById('preview-img');
const cancelUploadBtn    = document.getElementById('cancel-upload');
const leaveRoomBtn       = document.getElementById('leave-room-btn');

// Stan aplikacji
let currentUser       = null;
let currentRoom       = null;
let joinedRooms       = [];
let typingTimeout     = null;
let selectedImageFile = null;

// Inicjalizacja czatu
function initChat() {
  listenForEvents();
  setupUIHandlers();
}

// Nasłuchiwanie na wydarzenia z serwera
function listenForEvents() {
  socket.on('registered', ({ user, room, users, availableRooms }) => {
    currentUser   = user;
    currentRoom   = room;
    joinedRooms   = [room];

    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    currentRoomElement.textContent = `Pokój: ${room}`;
    updateUsersList(users);
    updateRoomsList(availableRooms);
    addSystemMessage(`Witaj ${user.username}! Dołączyłeś do pokoju ${room}`);
    scrollToBottom();
  });

  socket.on('new_message', message => {
    addChatMessage(message);
    if (message.user.id !== currentUser.id) {
      clearTypingIndicator(message.user.username);
    }
    scrollToBottom();
  });

  socket.on('user_joined', ({ user, message, users }) => {
    addSystemMessage(message);
    updateUsersList(users);
    scrollToBottom();
  });

  socket.on('user_left', ({ user, message, users }) => {
    addSystemMessage(message);
    updateUsersList(users);
    scrollToBottom();
  });

  socket.on('user_typing', ({ user }) => {
    addTypingIndicator(user);
  });

  socket.on('user_stop_typing', ({ user }) => {
    clearTypingIndicator(user);
  });

  socket.on('room_joined', ({ room, users }) => {
    if (!joinedRooms.includes(room)) {
      joinedRooms.push(room);
    }
    currentRoomElement.textContent = `Pokój: ${room}`;
    currentRoom = room;
    messagesContainer.innerHTML = '';
    updateUsersList(users);
    addSystemMessage(`Przełączyłeś się do pokoju ${room}`);
    scrollToBottom();
  });

  socket.on('room_left', ({ room }) => {
    joinedRooms = joinedRooms.filter(r => r !== room);
    addSystemMessage(`Opuściłeś pokój ${room}`);

    if (room === currentRoom) {
      if (joinedRooms.length > 0) {
        socket.emit('join_room', joinedRooms[0]);
      } else {
        currentRoom = null;
        currentRoomElement.textContent = `Pokój: -`;
        messagesContainer.innerHTML = '';
        updateUsersList([]);
      }
    }
  });

  socket.on('room_created', ({ room }) => {
    // Nowy pokój utworzony – od razu dołącz
    socket.emit('join_room', room);
  });

  socket.on('rooms_update', rooms => {
    updateRoomsList(rooms);
  });

  socket.on('error', ({ message }) => {
    alert(message);
  });
}

// Ustawienie obsługi UI
function setupUIHandlers() {
  // Logowanie
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = e.target.elements.username.value.trim();
    const room     = e.target.elements.room.value.trim() || 'main';
    if (username) {
      socket.emit('register', { username, room });
    }
  });

  // Wysyłanie wiadomości
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (text || selectedImageFile) {
      if (selectedImageFile) {
        const reader = new FileReader();
        reader.onload = event => {
          socket.emit('send_image', {
            text: text,
            image: event.target.result,
            room: currentRoom
          });
          resetImageUpload();
        };
        reader.readAsDataURL(selectedImageFile);
      } else {
        socket.emit('send_message', {
          text: text,
          room: currentRoom
        });
      }

      messageInput.value = '';
      socket.emit('stop_typing', { room: currentRoom });
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  });

  // Wskaźnik pisania
  messageInput.addEventListener('input', () => {
    if (!typingTimeout) {
      socket.emit('typing', { room: currentRoom });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { room: currentRoom });
      typingTimeout = null;
    }, 1000);
  });

  // Przełączanie/dołączanie pokoju
  roomsList.addEventListener('click', e => {
    if (e.target.classList.contains('room-item')) {
      const roomName = e.target.dataset.room;
      socket.emit('join_room', roomName);
    }
  });

  // Tworzenie nowego pokoju
  createRoomBtn.addEventListener('click', () => {
    const roomName = newRoomInput.value.trim();
    if (roomName) {
      socket.emit('create_room', roomName);
      newRoomInput.value = '';
    }
  });

  // Upload zdjęcia
  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size <= 5 * 1024 * 1024) {
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = e => {
          previewImg.src = e.target.result;
          imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      } else {
        alert('Plik jest zbyt duży! Maksymalny rozmiar to 5MB.');
        resetImageUpload();
      }
    } else {
      alert('Wybierz plik graficzny!');
      resetImageUpload();
    }
  });

  // Anuluj upload
  cancelUploadBtn.addEventListener('click', resetImageUpload);

  // Opuść pokój
  leaveRoomBtn.addEventListener('click', () => {
    if (currentRoom) {
      socket.emit('leave_room', { room: currentRoom });
    }
  });
}

// Reset uploadu zdjęcia
function resetImageUpload() {
  selectedImageFile = null;
  imageUpload.value = '';
  imagePreview.classList.add('hidden');
}

// Dodawanie wiadomości
function addChatMessage(message) {
  const isMyMessage = message.user.id === currentUser.id;
  const messageDiv   = document.createElement('div');
  messageDiv.classList.add('message', isMyMessage ? 'my-message' : 'other-message');

  const headerDiv = document.createElement('div');
  headerDiv.classList.add('message-header');
  const usernameSpan  = document.createElement('span');
  usernameSpan.classList.add('message-username');
  usernameSpan.textContent = message.user.username;
  const timestampSpan = document.createElement('span');
  timestampSpan.classList.add('message-timestamp');
  timestampSpan.textContent = formatTime(new Date(message.timestamp));
  headerDiv.append(usernameSpan, timestampSpan);

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  if (message.text) {
    contentDiv.textContent = message.text;
  }
  if (message.hasImage && message.imageData) {
    const img = document.createElement('img');
    img.src = message.imageData;
    img.classList.add('message-image');
    contentDiv.appendChild(img);
  }

  messageDiv.append(headerDiv, contentDiv);
  messagesContainer.appendChild(messageDiv);
}

// Komunikaty systemowe
function addSystemMessage(text) {
  const div = document.createElement('div');
  div.classList.add('system-message');
  div.textContent = text;
  messagesContainer.appendChild(div);
}

// Aktualizacja listy użytkowników
function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.username + (user.id === currentUser.id ? ' (Ty)' : '');
    if (user.id === currentUser.id) li.style.fontWeight = 'bold';
    usersList.appendChild(li);
  });
}

// Aktualizacja listy pokojów
function updateRoomsList(rooms) {
  roomsList.innerHTML = '';
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.classList.add('room-item');
    li.dataset.room = room.name;
    li.textContent = `${room.name} (${room.users})`;
    if (room.name === currentRoom) li.classList.add('active');
    roomsList.appendChild(li);
  });
}

// Wskaźnik pisania
function addTypingIndicator(username) {
  typingIndicator.textContent = `${username} pisze...`;
  typingIndicator.classList.remove('hidden');
}
function clearTypingIndicator(username) {
  if (typingIndicator.textContent.includes(username)) {
    typingIndicator.textContent = '';
    typingIndicator.classList.add('hidden');
  }
}

// Scroll do dołu
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format czasu
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Start!
document.addEventListener('DOMContentLoaded', initChat);
