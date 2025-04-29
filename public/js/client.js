const socket = io();

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

let currentUser       = null;
let currentRoom       = null;
let joinedRooms       = [];
let roomsCache        = [];
let typingTimeout     = null;
let selectedImageFile = null;

function initChat() {
  listenForEvents();
  setupUIHandlers();
}

function listenForEvents() {
  socket.on('registered', ({ user, room, users, availableRooms }) => {
    currentUser = user;
    currentRoom = room;
    joinedRooms = [room];

    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    currentRoomElement.textContent = `Pokój: ${room}`;
    updateUsersList(users);
    roomsCache = availableRooms;
    updateRoomsList(roomsCache);
    addSystemMessage(`Dołączyłeś do pokoju ${room}`, room);
    renderRoom(room);
    highlightActiveRoom();
  });

  socket.on('new_message', message => {
    addChatMessage(message);
    clearTypingIndicator(message.user.username);
    scrollToBottom();
  });

  socket.on('user_joined', ({ user, message, users }) => {
    addSystemMessage(message, currentRoom);
    updateUsersList(users);
  });

  socket.on('user_left', ({ user, message, users }) => {
    addSystemMessage(message, currentRoom);
    updateUsersList(users);
  });

  socket.on('user_typing', ({ user })    => addTypingIndicator(user));
  socket.on('user_stop_typing', ({ user })=> clearTypingIndicator(user));

  socket.on('room_joined', ({ room, users }) => {
    const isNew = !joinedRooms.includes(room);
    if (isNew) joinedRooms.push(room);

    currentRoom = room;
    currentRoomElement.textContent = `Pokój: ${room}`;
    updateUsersList(users);

    if (isNew) {
      addSystemMessage(`Dołączyłeś do pokoju ${room}`, room);
    }
    renderRoom(room);
    highlightActiveRoom();
  });

  socket.on('room_left', ({ room }) => {
    joinedRooms = joinedRooms.filter(r => r !== room);
    addSystemMessage(`Opuściłeś pokój ${room}`, room);

    if (room === currentRoom) {
      currentRoom = joinedRooms[0] || null;
      currentRoomElement.textContent = currentRoom ? `Pokój: ${currentRoom}` : 'Pokój: -';
    }
    renderRoom(currentRoom);
    highlightActiveRoom();
    updateUsersList([]);
  });

  socket.on('room_created', ({ room }) => socket.emit('join_room', room));

  socket.on('rooms_update', rooms => {
    roomsCache = rooms;
    updateRoomsList(roomsCache);
    highlightActiveRoom();
  });

  socket.on('error', ({ message }) => alert(message));
}

function setupUIHandlers() {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const room     = e.target.room.value.trim() || 'main';
    if (username) socket.emit('register', { username, room });
  });

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text && !selectedImageFile) return;

    if (selectedImageFile) {
      const reader = new FileReader();
      reader.onload = evt => {
        socket.emit('send_image', { text, image: evt.target.result, room: currentRoom });
        resetImageUpload();
      };
      reader.readAsDataURL(selectedImageFile);
    } else {
      socket.emit('send_message', { text, room: currentRoom });
    }

    messageInput.value = '';
    socket.emit('stop_typing', { room: currentRoom });
    clearTimeout(typingTimeout);
    typingTimeout = null;
  });

  messageInput.addEventListener('input', () => {
    if (!typingTimeout) socket.emit('typing', { room: currentRoom });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { room: currentRoom });
      typingTimeout = null;
    }, 1000);
  });

  roomsList.addEventListener('click', e => {
    if (e.target.classList.contains('room-item')) {
      socket.emit('join_room', e.target.dataset.room);
    }
  });

  createRoomBtn.addEventListener('click', () => {
    const roomName = newRoomInput.value.trim();
    if (roomName) {
      socket.emit('create_room', roomName);
      newRoomInput.value = '';
    }
  });

  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files[0];
    if (file && file.type.startsWith('image/') && file.size <= 5e6) {
      selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      alert('Wybierz obraz mniejszy niż 5MB');
      resetImageUpload();
    }
  });

  cancelUploadBtn.addEventListener('click', resetImageUpload);
  leaveRoomBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('leave_room', { room: currentRoom });
  });
}

function renderRoom(room) {
  Array.from(messagesContainer.children).forEach(el => {
    el.style.display = (el.dataset.room === room) ? '' : 'none';
  });
}

function highlightActiveRoom() {
  document.querySelectorAll('.room-item').forEach(li => {
    li.classList.toggle('active', li.dataset.room === currentRoom);
  });
}

function addChatMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message', message.user.id === currentUser.id ? 'my-message' : 'other-message');
  div.dataset.room = message.room || currentRoom;

  const hdr = document.createElement('div');
  hdr.classList.add('message-header');
  const u = document.createElement('span'); u.classList.add('message-username'); u.textContent = message.user.username;
  const t = document.createElement('span'); t.classList.add('message-timestamp'); t.textContent = new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  hdr.append(u, t);

  const cnt = document.createElement('div'); cnt.classList.add('message-content');
  if (message.text) cnt.textContent = message.text;
  if (message.hasImage) {
    const img = document.createElement('img'); img.src = message.imageData; img.classList.add('message-image'); cnt.appendChild(img);
  }

  div.append(hdr, cnt);
  messagesContainer.appendChild(div);
}

function addSystemMessage(text, room) {
  const div = document.createElement('div');
  div.classList.add('system-message');
  div.dataset.room = room;
  div.textContent = text;
  messagesContainer.appendChild(div);
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u.username + (u.id === currentUser.id ? ' (Ty)' : '');
    if (u.id === currentUser.id) li.style.fontWeight = 'bold';
    usersList.appendChild(li);
  });
}

function updateRoomsList(rooms) {
  roomsList.innerHTML = '';
  rooms.forEach(r => {
    const li = document.createElement('li');
    li.classList.add('room-item');
    li.dataset.room = r.name;
    li.textContent = `${r.name} (${r.users})`;
    if (r.name === currentRoom) li.classList.add('active');
    roomsList.appendChild(li);
  });
}

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

function resetImageUpload() {
  selectedImageFile = null;
  imageUpload.value = '';
  imagePreview.classList.add('hidden');
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', initChat);