// Strudel imports - will be loaded dynamically
let initStrudel, evaluate, hush;
let strudelInitialized = false;
let isPlaying = false;

// P2P imports
let trystero;
let room = null;
let ourPeerId = null;
let isHost = false;
let isConnected = false;

// Player state
let playerName = '';
let roomId = '';
let players = new Map(); // peerId -> { name, code, muted }

// Initialize Strudel
async function initializeStrudel() {
  if (strudelInitialized) return;
  
  try {
    // Try npm import first
    let strudelModule;
    try {
      strudelModule = await import('@strudel/web');
    } catch (e) {
      // Fallback to CDN
      console.log('Loading Strudel from CDN...');
      strudelModule = await import('https://cdn.jsdelivr.net/npm/@strudel/web@latest/dist/index.js');
    }
    
    initStrudel = strudelModule.initStrudel;
    evaluate = strudelModule.evaluate;
    hush = strudelModule.hush;
    
    await initStrudel();
    
    // Load default samples
    try {
      evaluate('samples("github:tidalcycles/dirt-samples")');
    } catch (e) {
      console.warn('Could not load samples:', e);
    }
    
    strudelInitialized = true;
    console.log('✓ Strudel initialized');
  } catch (error) {
    console.error('Failed to initialize Strudel:', error);
    alert('Failed to initialize Strudel. Please refresh the page.');
  }
}

// Initialize P2P
async function initializeP2P() {
  try {
    const trysteroModule = await import('trystero');
    trystero = trysteroModule.joinRoom;
    console.log('✓ Trystero loaded');
  } catch (error) {
    console.error('Failed to load Trystero:', error);
    alert('P2P functionality unavailable. Please check your connection.');
  }
}

// Initialize room connection
function initializeRoom(roomName, playerNameValue) {
  if (!trystero) {
    alert('Trystero not loaded. Please refresh the page.');
    return;
  }
  
  try {
    const config = { appId: 'strudelism-multiplayer' };
    room = trystero(config, roomName);
    
    ourPeerId = room.selfId;
    console.log('Our peer ID:', ourPeerId);
    
    // Create actions
    const [sendPlayerData, getPlayerData] = room.makeAction('playerData');
    const [sendPlayState, getPlayState] = room.makeAction('playState');
    const [sendHostAnnounce, getHostAnnounce] = room.makeAction('hostAnnounce');
    
    room.actions = { sendPlayerData, sendPlayState, sendHostAnnounce };
    
    // Handle player data
    getPlayerData((data, peerId) => {
      const [name, code, muted] = data || ['Unknown', '', false];
      console.log('📦 Received from:', name, peerId);
      
      players.set(peerId, { name, code, muted });
      updatePlayersDisplay();
      
      // If host and playing, re-evaluate
      if (isHost && isPlaying) {
        evaluateMixedCode();
      }
    });
    
    // Handle play state
    getPlayState((data, peerId) => {
      const [playing, isSenderHost] = data || [false, false];
      
      if (isSenderHost && peerId !== ourPeerId) {
        // Remote host is controlling
        if (playing && !isPlaying) {
          isPlaying = true;
          updatePlayButton();
          evaluateMixedCode();
        } else if (!playing && isPlaying) {
          isPlaying = false;
          if (hush) hush();
          else if (evaluate) evaluate('hush()');
          updatePlayButton();
        }
      }
    });
    
    // Handle host announcement
    getHostAnnounce((data, peerId) => {
      const [announcedHostId] = data || [null];
      if (announcedHostId && announcedHostId < ourPeerId) {
        isHost = false;
        updateConnectionUI();
        hideMasterPanel();
      }
    });
    
    // Peer join/leave
    room.onPeerJoin((peerId) => {
      console.log('Peer joined:', peerId);
      determineHost();
      setTimeout(() => {
        syncPlayerData();
      }, 500);
    });
    
    room.onPeerLeave((peerId) => {
      console.log('Peer left:', peerId);
      players.delete(peerId);
      updatePlayersDisplay();
      determineHost();
      
      if (isHost && isPlaying) {
        evaluateMixedCode();
      }
    });
    
    // Determine host on join
    setTimeout(() => {
      determineHost();
      syncPlayerData();
    }, 1000);
    
    isConnected = true;
    updateConnectionUI();
    
  } catch (error) {
    console.error('Failed to initialize room:', error);
    alert('Failed to connect: ' + error.message);
  }
}

// Determine host (lowest peer ID)
function determineHost() {
  const allPeerIds = Array.from(players.keys()).concat([ourPeerId]);
  allPeerIds.sort();
  const firstPeerId = allPeerIds[0];
  
  const wasHost = isHost;
  isHost = (firstPeerId === ourPeerId);
  
  if (isHost && !wasHost) {
    console.log('🎯 We are now the host');
    try {
      room.actions.sendHostAnnounce([ourPeerId]);
    } catch (e) {
      console.warn('Failed to announce host:', e);
    }
    showMasterPanel();
  } else if (!isHost && wasHost) {
    console.log('👤 We are no longer the host');
    hideMasterPanel();
  }
  
  updateConnectionUI();
}

// Sync player data to peers
function syncPlayerData() {
  if (!room || !room.actions) return;
  
  const codeEditor = document.getElementById(`code-${ourPeerId}`);
  const code = codeEditor ? codeEditor.value : '';
  const muted = players.get(ourPeerId)?.muted || false;
  
  try {
    room.actions.sendPlayerData([playerName, code, muted]);
    console.log('📤 Sent player data');
  } catch (error) {
    console.warn('Failed to sync:', error);
  }
}

// Update players display
function updatePlayersDisplay() {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Add self first
  const selfCode = document.getElementById(`code-${ourPeerId}`)?.value || '';
  const selfMuted = players.get(ourPeerId)?.muted || false;
  players.set(ourPeerId, { name: playerName, code: selfCode, muted: selfMuted });
  
  // Render all players
  players.forEach((playerData, peerId) => {
    const isSelf = peerId === ourPeerId;
    const card = createPlayerCard(peerId, playerData, isSelf);
    grid.appendChild(card);
  });
}

// Create player card
function createPlayerCard(peerId, playerData, isSelf) {
  const card = document.createElement('div');
  card.className = `player-card ${isSelf ? 'self' : ''} ${playerData.muted ? 'muted' : ''} ${isHost && isSelf ? 'host' : ''}`;
  card.id = `player-${peerId}`;
  
  const codeEditorId = `code-${peerId}`;
  
  card.innerHTML = `
    <div class="player-header">
      <div class="player-name">
        ${playerData.name || 'Unknown'}
        ${isSelf ? '<span class="player-badge">You</span>' : ''}
        ${isHost && peerId === ourPeerId ? '<span class="player-badge host">Host</span>' : ''}
      </div>
      <div class="player-controls">
        <button class="btn-toggle ${playerData.muted ? 'active' : ''}" 
                data-action="mute" 
                data-peer="${peerId}"
                title="Mute/Unmute">
          ${playerData.muted ? '🔇' : '🔊'}
        </button>
        ${isHost ? `
          <button class="btn-toggle" 
                  data-action="remove" 
                  data-peer="${peerId}"
                  title="Remove from mix">
            ❌
          </button>
        ` : ''}
      </div>
    </div>
    <textarea 
      id="${codeEditorId}" 
      class="player-code-editor" 
      placeholder="Enter your Strudel code here...&#10;&#10;Example:&#10;s('bd ~ ~ ~')"
      ${!isSelf ? 'readonly' : ''}
    >${playerData.code || ''}</textarea>
    <div class="player-status">
      <span>${playerData.muted ? '🔇 Muted' : '🔊 Active'}</span>
      <span>${playerData.code ? playerData.code.split('\\n').length + ' lines' : 'No code'}</span>
    </div>
  `;
  
  // Add event listeners
  if (isSelf) {
    const editor = card.querySelector(`#${codeEditorId}`);
    let syncTimeout;
    
    editor.addEventListener('input', () => {
      // Sync code changes (debounced)
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncPlayerData();
      }, 1500);
      
      // Store locally
      const code = editor.value;
      if (players.has(peerId)) {
        players.get(peerId).code = code;
      }
      
      // If host and playing, re-evaluate
      if (isHost && isPlaying) {
        evaluateMixedCode();
      }
    });
  }
  
  // Mute button
  const muteBtn = card.querySelector('[data-action="mute"]');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = !playerData.muted;
      playerData.muted = muted;
      
      if (peerId === ourPeerId) {
        syncPlayerData();
      }
      
      updatePlayersDisplay();
      
      if (isHost && isPlaying) {
        evaluateMixedCode();
      }
    });
  }
  
  // Remove button (host only)
  const removeBtn = card.querySelector('[data-action="remove"]');
  if (removeBtn && isHost) {
    removeBtn.addEventListener('click', () => {
      if (confirm(`Remove ${playerData.name} from the mix?`)) {
        playerData.muted = true;
        updatePlayersDisplay();
        if (isPlaying) {
          evaluateMixedCode();
        }
      }
    });
  }
  
  return card;
}

// Evaluate mixed code (host only)
function evaluateMixedCode() {
  if (!isHost || !isPlaying || !evaluate) return;
  
  const activeCodes = [];
  
  players.forEach((playerData, peerId) => {
    if (!playerData.muted && playerData.code && playerData.code.trim()) {
      activeCodes.push(playerData.code.trim());
    }
  });
  
  if (activeCodes.length === 0) {
    if (hush) hush();
    else if (evaluate) evaluate('hush()');
    updateMasterCode('// No active players');
    return;
  }
  
  // Combine all codes with stack()
  let mixedCode = '';
  if (activeCodes.length === 1) {
    mixedCode = activeCodes[0];
  } else {
    mixedCode = `stack(\n  ${activeCodes.join(',\n  ')}\n)`;
  }
  
  // Add setcps if not present
  if (!mixedCode.includes('setcps')) {
    mixedCode = 'setcps(1)\n' + mixedCode;
  }
  
  updateMasterCode(mixedCode);
  
  try {
    evaluate(mixedCode);
    console.log('✓ Mixed code evaluated:', activeCodes.length, 'players');
  } catch (error) {
    console.error('✗ Evaluation failed:', error);
    updateMasterCode(`// Error: ${error.message}\n\n${mixedCode}`);
  }
}

// Update master code preview
function updateMasterCode(code) {
  const masterCodeEl = document.getElementById('master-code');
  if (masterCodeEl) {
    masterCodeEl.textContent = code;
  }
}

// Show/hide master panel
function showMasterPanel() {
  const panel = document.getElementById('master-panel');
  if (panel) {
    panel.style.display = 'block';
  }
}

function hideMasterPanel() {
  const panel = document.getElementById('master-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Update connection UI
function updateConnectionUI() {
  const status = document.getElementById('room-status');
  const roomIdDisplay = document.getElementById('room-id-display');
  
  if (isConnected) {
    if (status) {
      status.textContent = isHost ? 'Host' : 'Connected';
      status.className = `badge ${isHost ? 'badge-host' : 'badge-connected'}`;
    }
    if (roomIdDisplay) {
      roomIdDisplay.textContent = `Room: ${roomId}`;
    }
  } else {
    if (status) {
      status.textContent = 'Disconnected';
      status.className = 'badge badge-disconnected';
    }
    if (roomIdDisplay) {
      roomIdDisplay.textContent = '';
    }
  }
}

// Update play button
function updatePlayButton() {
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }
}

// Play/Stop handlers
async function handlePlay() {
  if (!strudelInitialized) {
    await initializeStrudel();
  }
  
  if (!isConnected) {
    alert('Please connect to a room first');
    return;
  }
  
  if (!isHost) {
    alert('Only the host can control playback');
    return;
  }
  
  if (isPlaying) {
    // Stop
    if (hush) hush();
    else if (evaluate) evaluate('hush()');
    isPlaying = false;
    updatePlayButton();
    
    // Sync play state
    if (room && room.actions) {
      try {
        room.actions.sendPlayState([false, true]);
      } catch (e) {
        console.warn('Failed to sync play state:', e);
      }
    }
  } else {
    // Play
    isPlaying = true;
    updatePlayButton();
    evaluateMixedCode();
    
    // Sync play state
    if (room && room.actions) {
      try {
        room.actions.sendPlayState([true, true]);
      } catch (e) {
        console.warn('Failed to sync play state:', e);
      }
    }
  }
}

function handleStop() {
  if (!isHost) {
    alert('Only the host can control playback');
    return;
  }
  
  if (hush) hush();
  else if (evaluate) evaluate('hush()');
  isPlaying = false;
  updatePlayButton();
  
  if (room && room.actions) {
    try {
      room.actions.sendPlayState([false, true]);
    } catch (e) {
      console.warn('Failed to sync play state:', e);
    }
  }
}

// Connect handler
function handleConnect() {
  const modal = document.getElementById('connect-modal');
  const nameInput = document.getElementById('player-name-input');
  const roomInput = document.getElementById('room-id-input');
  
  // Read room ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomId = urlParams.get('room');
  if (urlRoomId && !roomInput.value) {
    roomInput.value = urlRoomId;
  }
  
  // Generate default name if empty
  if (!nameInput.value.trim()) {
    nameInput.value = `Player${Math.floor(Math.random() * 1000)}`;
  }
  
  modal.classList.add('active');
}

function handleJoin() {
  const nameInput = document.getElementById('player-name-input');
  const roomInput = document.getElementById('room-id-input');
  
  const name = nameInput.value.trim();
  let roomName = roomInput.value.trim();
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  // Generate room ID if empty
  if (!roomName) {
    roomName = Math.random().toString(36).substring(2, 9);
  }
  
  playerName = name;
  roomId = roomName;
  
  // Update URL
  const url = new URL(window.location);
  url.searchParams.set('room', roomId);
  window.history.pushState({}, '', url);
  
  // Close modal
  document.getElementById('connect-modal').classList.remove('active');
  
  // Initialize room
  initializeRoom(roomId, playerName);
}

// Initialize app
async function init() {
  await Promise.all([initializeStrudel(), initializeP2P()]);
  
  // Event listeners
  document.getElementById('connect-btn').addEventListener('click', handleConnect);
  document.getElementById('join-btn').addEventListener('click', handleJoin);
  document.getElementById('cancel-connect-btn').addEventListener('click', () => {
    document.getElementById('connect-modal').classList.remove('active');
  });
  document.getElementById('play-btn').addEventListener('click', handlePlay);
  document.getElementById('stop-btn').addEventListener('click', handleStop);
  
  document.getElementById('copy-room-btn').addEventListener('click', () => {
    if (roomId) {
      navigator.clipboard.writeText(`${window.location.href}`);
      alert('Room URL copied to clipboard!');
    }
  });
  
  // Master controls
  document.getElementById('master-mute-all')?.addEventListener('click', () => {
    players.forEach((player) => {
      player.muted = true;
    });
    syncPlayerData();
    updatePlayersDisplay();
    if (isPlaying) evaluateMixedCode();
  });
  
  document.getElementById('master-unmute-all')?.addEventListener('click', () => {
    players.forEach((player) => {
      player.muted = false;
    });
    syncPlayerData();
    updatePlayersDisplay();
    if (isPlaying) evaluateMixedCode();
  });
  
  // Auto-connect if room ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomId = urlParams.get('room');
  if (urlRoomId) {
    playerName = `Player${Math.floor(Math.random() * 1000)}`;
    roomId = urlRoomId;
    setTimeout(() => {
      initializeRoom(roomId, playerName);
    }, 1000);
  }
  
  console.log('✓ App initialized');
}

// Start app
init();

