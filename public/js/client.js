// Połączenie Socket.IO
const socket = io();

// Elementy DOM
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const messagesContainer = document.getElementById('messages');
const usersList = document.getElementById('users');
const roomsList = document.getElementById('rooms');
const currentRoomElement = document.getElementById('current-room');
const createRoomBtn = document.getElementById('create-room-btn');
const newRoomInput = document.getElementById('new-room');
const typingIndicator = document.getElementById('typing-indicator');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const cancelUploadBtn = document.getElementById('cancel-upload');

// Stan aplikacji
let currentUser = null;
let currentRoom = 'main';
let typingTimeout = null;
let selectedImageFile = null;

// Funkcja inicjalizacji czatu
function initChat() {
  // Nasłuchiwanie na wydarzenia z serwera
  listenForEvents();
  
  // Inicjalizacja obsługi zdarzeń UI
  setupUIHandlers();
}

// Funkcja nasłuchująca na wydarzenia z serwera
function listenForEvents() {
  // Pomyślna rejestracja
  socket.on('registered', ({ user, room, users, availableRooms }) => {
    currentUser = user;
    currentRoom = room;
    
    // Ukryj formularz logowania, pokaż czat
    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    
    // Zaktualizuj nazwy pokoju
    currentRoomElement.textContent = `Pokój: ${room}`;
    
    // Zaktualizuj listę użytkowników
    updateUsersList(users);
    
    // Zaktualizuj listę pokojów
    updateRoomsList(availableRooms);
    
    // Dodaj wiadomość powitalna
    addSystemMessage(`Witaj ${user.username}! Dołączyłeś do pokoju ${room}`);
    
    // Przewiń do dołu
    scrollToBottom();
  });
  
  // Nowa wiadomość
  socket.on('new_message', (message) => {
    addChatMessage(message);
    
    // Jeśli to wiadomość od innego użytkownika, usuń wskaźnik pisania
    if (message.user.id !== currentUser.id) {
      clearTypingIndicator(message.user.username);
    }
    
    // Przewiń do dołu
    scrollToBottom();
  });
  
  // Nowy użytkownik dołączył do pokoju
  socket.on('user_joined', ({ user, message }) => {
    addSystemMessage(message);
    scrollToBottom();
  });
  
  // Użytkownik opuścił pokój
  socket.on('user_left', ({ user, message }) => {
    addSystemMessage(message);
    scrollToBottom();
  });
  
  // Użytkownik pisze
  socket.on('user_typing', ({ user }) => {
    addTypingIndicator(user);
  });
  
  // Użytkownik przestał pisać
  socket.on('user_stop_typing', ({ user }) => {
    clearTypingIndicator(user);
  });
  
  // Dołączono do nowego pokoju
  socket.on('room_joined', ({ room, users }) => {
    currentRoom = room;
    currentRoomElement.textContent = `Pokój: ${room}`;
    
    // Wyczyść wiadomości
    messagesContainer.innerHTML = '';
    
    // Zaktualizuj listę użytkowników
    updateUsersList(users);
    
    // Dodaj wiadomość powitalna
    addSystemMessage(`Dołączyłeś do pokoju ${room}`);
    
    // Przewiń do dołu
    scrollToBottom();
  });
  
  // Utworzono nowy pokój
  socket.on('room_created', ({ room }) => {
    socket.emit('join_room', room);
  });
  
  // Aktualizacja listy pokojów
  socket.on('rooms_update', (rooms) => {
    updateRoomsList(rooms);
  });
  
  // Błąd
  socket.on('error', ({ message }) => {
    alert(message);
  });
}

// Funkcja ustawiająca obsługę zdarzeń UI
function setupUIHandlers() {
  // Obsługa formularza logowania
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = e.target.elements.username.value.trim();
    const room = e.target.elements.room.value.trim() || 'main';
    
    if (username) {
      socket.emit('register', { username, room });
    }
  });

// Obsługa formularza wysyłania wiadomości
chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    
    if (text || selectedImageFile) {
      // Jeśli mamy zdjęcie do wysłania
      if (selectedImageFile) {
        const reader = new FileReader();
        reader.onload = function(event) {
          socket.emit('send_image', {
            text: text,
            image: event.target.result
          });
          
          // Resetuj stan
          resetImageUpload();
        };
        reader.readAsDataURL(selectedImageFile);
      } else if (text) {
        // Zwykła wiadomość tekstowa
        socket.emit('send_message', { text });
      }
      
      // Wyczyść input i zresetuj stan
      messageInput.value = '';
      socket.emit('stop_typing');
      clearTimeout(typingTimeout);
    }
  });
  
  // Obsługa pisania wiadomości
  messageInput.addEventListener('input', () => {
    // Emisja "użytkownik pisze" tylko raz, nie z każdym znakiem
    if (!typingTimeout) {
      socket.emit('typing');
    }
    
    // Zresetuj timer
    clearTimeout(typingTimeout);
    
    // Ustaw nowy timer
    typingTimeout = setTimeout(() => {
      socket.emit('stop_typing');
      typingTimeout = null;
    }, 1000);
  });
  
  // Obsługa wyboru pokoju
  roomsList.addEventListener('click', e => {
    if (e.target.classList.contains('room-item')) {
      const roomName = e.target.dataset.room;
      if (roomName !== currentRoom) {
        socket.emit('join_room', roomName);
      }
    }
  });
  
  // Obsługa tworzenia nowego pokoju
  createRoomBtn.addEventListener('click', () => {
    const roomName = newRoomInput.value.trim();
    if (roomName) {
      socket.emit('create_room', roomName);
      newRoomInput.value = '';
    }
  });
  
  // Obsługa uploadowania zdjęcia
  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size <= 5 * 1024 * 1024) { // Maksymalnie 5MB
          selectedImageFile = file;
          
          // Pokaż podgląd
          const reader = new FileReader();
          reader.onload = function(e) {
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
    }
  });
  
  // Obsługa anulowania uploadu zdjęcia
  cancelUploadBtn.addEventListener('click', () => {
    resetImageUpload();
  });
}

// Funkcja resetująca stan uploadu zdjęcia
function resetImageUpload() {
  selectedImageFile = null;
  imageUpload.value = '';
  imagePreview.classList.add('hidden');
}

// Funkcja dodająca wiadomość do czatu
function addChatMessage(message) {
  const isMyMessage = message.user.id === currentUser.id;
  
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', isMyMessage ? 'my-message' : 'other-message');
  
  // Nagłówek wiadomości z nazwą użytkownika i czasem
  const headerDiv = document.createElement('div');
  headerDiv.classList.add('message-header');
  
  const usernameSpan = document.createElement('span');
  usernameSpan.classList.add('message-username');
  usernameSpan.textContent = message.user.username;
  
  const timestampSpan = document.createElement('span');
  timestampSpan.classList.add('message-timestamp');
  timestampSpan.textContent = formatTime(new Date(message.timestamp));
  
  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(timestampSpan);
  
  // Treść wiadomości
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  
  // Dodaj tekst jeśli istnieje
  if (message.text) {
    contentDiv.textContent = message.text;
  }
  
  // Dodaj zdjęcie jeśli istnieje
  if (message.hasImage && message.imageData) {
    const img = document.createElement('img');
    img.src = message.imageData;
    img.classList.add('message-image');
    img.addEventListener('click', () => {
      window.open(message.imageData, '_blank');
    });
    contentDiv.appendChild(img);
  }
  
  // Dodaj elementy do wiadomości
  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);
  
  // Dodaj wiadomość do kontenera
  messagesContainer.appendChild(messageDiv);
}

// Funkcja dodająca komunikat systemowy
function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('system-message');
  messageDiv.textContent = text;
  
  messagesContainer.appendChild(messageDiv);
}

// Funkcja aktualizująca listę użytkowników
function updateUsersList(users) {
  usersList.innerHTML = '';
  
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.username;
    
    if (user.id === currentUser?.id) {
      li.textContent += ' (Ty)';
      li.style.fontWeight = 'bold';
    }
    
    usersList.appendChild(li);
  });
}

// Funkcja aktualizująca listę pokojów
function updateRoomsList(rooms) {
  roomsList.innerHTML = '';
  
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.classList.add('room-item');
    li.dataset.room = room.name;
    li.textContent = `${room.name} (${room.users})`;
    
    if (room.name === currentRoom) {
      li.classList.add('active');
    }
    
    roomsList.appendChild(li);
  });
}

// Funkcja dodająca wskaźnik "użytkownik pisze"
function addTypingIndicator(username) {
  typingIndicator.textContent = `${username} pisze...`;
  typingIndicator.classList.remove('hidden');
}

// Funkcja usuwająca wskaźnik "użytkownik pisze"
function clearTypingIndicator(username) {
  if (typingIndicator.textContent.includes(username)) {
    typingIndicator.textContent = '';
    typingIndicator.classList.add('hidden');
  }
}

// Funkcja przewijająca kontener wiadomości do dołu
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Pomocnicza funkcja formatująca czas
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Inicjalizacja czatu po załadowaniu strony
document.addEventListener('DOMContentLoaded', initChat);