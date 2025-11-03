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
    
    // CRITICAL: Load default samples BEFORE anything else
    console.log('Loading Strudel samples...');
    try {
      // Load default Tidal Cycles samples - use await samples() if available
      // The samples() function needs to be called properly
      const samplesResult = evaluate('await samples("github:tidalcycles/dirt-samples")');
      console.log('✓ Samples loaded successfully', samplesResult);
      window.samplesLoaded = true;
    } catch (e) {
      console.warn('Could not load samples with await, trying sync:', e);
      try {
        // Try without await
        evaluate('samples("github:tidalcycles/dirt-samples")');
        console.log('✓ Samples loaded (sync)');
        window.samplesLoaded = true;
      } catch (e2) {
        console.warn('Sync load failed, trying direct:', e2);
        try {
          // Try direct samples path
          evaluate('samples("bd", "github:tidalcycles/dirt-samples/bd")');
          evaluate('samples("sn", "github:tidalcycles/dirt-samples/sn")');
          evaluate('samples("hh", "github:tidalcycles/dirt-samples/hh")');
          console.log('✓ Samples loaded (direct)');
          window.samplesLoaded = true;
        } catch (e3) {
          console.error('Failed to load samples:', e3);
          // Don't alert - just warn, samples might work anyway
        }
      }
    }
    
    strudelInitialized = true;
    console.log('✓ Strudel initialized with samples');
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
    
    // Wait for peer ID to be available
    const checkPeerId = setInterval(() => {
      if (room.selfId) {
        ourPeerId = room.selfId;
        console.log('Our peer ID:', ourPeerId);
        clearInterval(checkPeerId);
        
        // Update players map with new peer ID if we had a placeholder
        if (players.has('local-')) {
          const oldData = players.get('local-');
          players.delete('local-');
          players.set(ourPeerId, oldData);
        }
        
        // Ensure self is in players map
        if (!players.has(ourPeerId)) {
          players.set(ourPeerId, { name: playerName, code: '', muted: false });
        }
        
        updatePlayersDisplay();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkPeerId);
      if (!ourPeerId) {
        console.warn('Peer ID not available, using placeholder');
        ourPeerId = ourPeerId || 'temp-' + Math.random().toString(36).substring(2, 9);
      }
    }, 5000);
    
    // Create actions
    const [sendPlayerData, getPlayerData] = room.makeAction('playerData');
    const [sendPlayState, getPlayState] = room.makeAction('playState');
    const [sendHostAnnounce, getHostAnnounce] = room.makeAction('hostAnnounce');
    
    room.actions = { sendPlayerData, sendPlayState, sendHostAnnounce };
    
    // Handle player data
    getPlayerData((data, peerId) => {
      const [name, code, muted] = data || ['Unknown', '', false];
      console.log('📦 Received from:', name, peerId, 'code length:', code.length);
      
      // Update player data
      if (!players.has(peerId)) {
        players.set(peerId, { name, code, muted });
      } else {
        const existing = players.get(peerId);
        existing.name = name;
        existing.code = code;
        existing.muted = muted;
      }
      
      // Update display (this will update the editor for remote players if host)
      updatePlayersDisplay();
      
      // If playing, immediately re-evaluate mixed code (all players)
      if (isPlaying) {
        clearTimeout(window.remoteEvalTimeout);
        window.remoteEvalTimeout = setTimeout(() => {
          evaluateMixedCode();
        }, 200);
      }
    });
    
    // Handle play state (sync playback across all players)
    getPlayState((data, peerId) => {
      const [playing] = data || [false];
      
      // Sync playback state (optional - players can control independently)
      // This helps keep everyone in sync if desired
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
  if (!grid) {
    console.error('Players grid not found!');
    return;
  }
  
  // CRITICAL: Always ensure self is in players map with current editor value
  const selfEditor = document.getElementById(`code-${ourPeerId}`);
  const selfCode = selfEditor ? selfEditor.value : '';
  const selfMuted = players.get(ourPeerId)?.muted || false;
  const selfName = playerName || `Player${Math.floor(Math.random() * 1000)}`;
  
  players.set(ourPeerId, { name: selfName, code: selfCode, muted: selfMuted });
  
  // Get all peer IDs (including self)
  const allPeerIds = Array.from(players.keys());
  
  // Ensure self is always first
  const sortedPeerIds = [ourPeerId, ...allPeerIds.filter(id => id !== ourPeerId)];
  
  // Create/update cards for all players
  sortedPeerIds.forEach(peerId => {
    const playerData = players.get(peerId);
    if (!playerData) {
      console.warn('No player data for', peerId);
      return;
    }
    
    const isSelf = peerId === ourPeerId;
    
    let card = document.getElementById(`player-${peerId}`);
    
    if (!card) {
      // Create new card - THIS IS WHERE THE EDITOR IS CREATED
      console.log('Creating new card for', peerId, 'isSelf:', isSelf);
      card = createPlayerCard(peerId, playerData, isSelf);
      grid.appendChild(card);
    } else {
      // Update existing card (preserve editor content)
      const existingEditor = card.querySelector(`#code-${peerId}`);
      const currentCode = existingEditor ? existingEditor.value : '';
      
      // Only update if code changed externally
      if (playerData.code !== currentCode && !isSelf) {
        if (existingEditor) {
          existingEditor.value = playerData.code || '';
        }
      }
      
      // Update muted state
      const muted = playerData.muted;
      card.className = `player-card ${isSelf ? 'self' : ''} ${muted ? 'muted' : ''} ${isHost && isSelf ? 'host' : ''}`;
      
      // Update mute button
      const muteBtn = card.querySelector('[data-action="mute"]');
      if (muteBtn) {
        muteBtn.className = `btn-toggle ${muted ? 'active' : ''}`;
        muteBtn.innerHTML = muted ? '🔇' : '🔊';
      }
      
      // Update status
      const statusEl = card.querySelector('.player-status');
      if (statusEl) {
        const code = isSelf ? currentCode : playerData.code;
        const codeLines = code ? code.split('\n').length : 0;
        statusEl.innerHTML = `
          <span>${muted ? '🔇 Muted' : '🔊 Active'}</span>
          <span>${codeLines > 0 ? codeLines + ' lines' : 'No code'}</span>
        `;
      }
    }
  });
  
  // Remove cards for players that left (but NEVER remove self)
  Array.from(grid.children).forEach(child => {
    const playerId = child.id.replace('player-', '');
    if (playerId !== ourPeerId && !players.has(playerId)) {
      child.remove();
    }
  });
  
  console.log('Display updated. Players:', players.size, 'Cards in grid:', grid.children.length);
}

// Create player card
function createPlayerCard(peerId, playerData, isSelf) {
  // Check if card already exists
  const existingCard = document.getElementById(`player-${peerId}`);
  if (existingCard && isSelf) {
    // Update existing card instead of recreating
    const editor = existingCard.querySelector(`#code-${peerId}`);
    if (editor && editor.value !== playerData.code) {
      editor.value = playerData.code || '';
    }
    const muted = playerData.muted;
    existingCard.className = `player-card ${isSelf ? 'self' : ''} ${muted ? 'muted' : ''} ${isHost && isSelf ? 'host' : ''}`;
    
    // Update mute button
    const muteBtn = existingCard.querySelector('[data-action="mute"]');
    if (muteBtn) {
      muteBtn.className = `btn-toggle ${muted ? 'active' : ''}`;
      muteBtn.innerHTML = muted ? '🔇' : '🔊';
    }
    
    // Update status
    const statusEl = existingCard.querySelector('.player-status');
    if (statusEl) {
      const codeLines = playerData.code ? playerData.code.split('\n').length : 0;
      statusEl.innerHTML = `
        <span>${muted ? '🔇 Muted' : '🔊 Active'}</span>
        <span>${codeLines > 0 ? codeLines + ' lines' : 'No code'}</span>
      `;
    }
    
    return existingCard;
  }
  
  // Create new card
  const card = document.createElement('div');
  card.className = `player-card ${isSelf ? 'self' : ''} ${playerData.muted ? 'muted' : ''} ${isHost && isSelf ? 'host' : ''}`;
  card.id = `player-${peerId}`;
  
  const codeEditorId = `code-${peerId}`;
  const codeLines = playerData.code ? playerData.code.split('\n').length : 0;
  
  card.innerHTML = `
    <div class="player-header">
      <div class="player-name">
        ${playerData.name || 'Unknown'}
        ${isSelf ? '<span class="player-badge">You</span>' : ''}
      </div>
      <div class="player-controls">
        <button class="btn-toggle ${playerData.muted ? 'active' : ''}" 
                data-action="mute" 
                data-peer="${peerId}"
                title="Mute/Unmute">
          ${playerData.muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
    <div class="repl-container">
      <textarea 
        id="${codeEditorId}" 
        class="player-code-editor" 
        placeholder="Enter your Strudel code here...&#10;&#10;Example:&#10;s('bd ~ ~ ~')&#10;or&#10;n('c e g').scale('C4:major')"
        ${!isSelf && !isHost ? 'readonly' : ''}
      >${playerData.code || ''}</textarea>
      ${isSelf ? `
        <button class="btn-eval" data-action="eval" data-peer="${peerId}" title="Evaluate your code locally">
          ▶ Eval
        </button>
      ` : ''}
    </div>
    <div class="player-status">
      <span>${playerData.muted ? '🔇 Muted' : '🔊 Active'}</span>
      <span>${codeLines > 0 ? codeLines + ' lines' : 'No code'}</span>
    </div>
  `;
  
  // Add event listeners
  const editor = card.querySelector(`#${codeEditorId}`);
  
  if (isSelf || isHost) {
    // Local player or host can edit
    let syncTimeout;
    
    editor.addEventListener('input', () => {
      const code = editor.value;
      
      // Store locally immediately
      if (players.has(peerId)) {
        players.get(peerId).code = code;
      }
      
      // Sync to peers (debounced)
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        if (peerId === ourPeerId) {
          syncPlayerData();
        }
      }, 800); // Faster sync for better responsiveness
      
      // If playing, immediately re-evaluate mixed code (all players)
      if (isPlaying) {
        // Small delay to batch multiple edits
        clearTimeout(window.evalTimeout);
        window.evalTimeout = setTimeout(() => {
          evaluateMixedCode();
        }, 300);
      }
    });
    
    // Eval button for local player
    const evalBtn = card.querySelector('[data-action="eval"]');
    if (evalBtn && isSelf) {
      evalBtn.addEventListener('click', () => {
        const code = editor.value.trim();
        if (code && evaluate) {
          // Ensure samples are loaded
          if (!window.samplesLoaded) {
            try {
              evaluate('samples("github:tidalcycles/dirt-samples")');
              window.samplesLoaded = true;
            } catch (e) {
              console.warn('Could not load samples:', e);
            }
          }
          
          try {
            evaluate(code);
            console.log('✓ Local evaluation successful');
          } catch (error) {
            console.error('✗ Evaluation error:', error);
            alert('Error: ' + error.message);
          }
        }
      });
    }
  }
  
  // Mute button - ALL PLAYERS CAN MUTE ANYONE
  const muteBtn = card.querySelector('[data-action="mute"]');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = !playerData.muted;
      playerData.muted = muted;
      
      // Sync mute state if it's our own or if we're muting someone
      if (peerId === ourPeerId) {
        syncPlayerData();
      }
      
      updatePlayersDisplay();
      
      // Re-evaluate if playing (all players do this)
      if (isPlaying) {
        evaluateMixedCode();
      }
    });
  }
  
  return card;
}

// Evaluate mixed code - ALL PLAYERS DO THIS LOCALLY
function evaluateMixedCode() {
  if (!evaluate) return;
  
  // Ensure samples are loaded first
  if (!window.samplesLoaded) {
    try {
      // Try loading samples if not already loaded
      evaluate('samples("github:tidalcycles/dirt-samples")');
      window.samplesLoaded = true;
      console.log('✓ Samples load initiated before evaluation');
      // Note: samples load asynchronously, Strudel will handle it
    } catch (e) {
      console.warn('Could not load samples:', e);
    }
  }
  
  // Collect all active (non-muted) codes
  const activeCodes = [];
  const activePlayers = [];
  
  players.forEach((playerData, peerId) => {
    const code = playerData.code ? playerData.code.trim() : '';
    if (!playerData.muted && code && !code.startsWith('//')) {
      activeCodes.push(code);
      activePlayers.push(playerData.name || peerId);
    }
  });
  
  if (activeCodes.length === 0) {
    if (isPlaying) {
      if (hush) hush();
      else if (evaluate) evaluate('hush()');
      isPlaying = false;
      updatePlayButton();
    }
    updateMasterCode('// No active players\n// Add code to your REPL and unmute to start playing');
    return;
  }
  
  // Combine all codes with stack()
  let mixedCode = '';
  if (activeCodes.length === 1) {
    mixedCode = activeCodes[0];
  } else {
    mixedCode = `stack(\n  ${activeCodes.map((code, idx) => `  // ${activePlayers[idx]}\n  ${code}`).join(',\n')}\n)`;
  }
  
  // Add setcps if not present
  if (!mixedCode.includes('setcps')) {
    mixedCode = 'setcps(1)\n' + mixedCode;
  }
  
  updateMasterCode(mixedCode);
  
  // Only evaluate if playing
  if (isPlaying) {
    try {
      evaluate(mixedCode);
      console.log('✓ Mixed code evaluated:', activeCodes.length, 'players:', activePlayers.join(', '));
    } catch (error) {
      console.error('✗ Evaluation failed:', error);
      updateMasterCode(`// Error: ${error.message}\n\n${mixedCode}`);
    }
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
      status.textContent = 'Connected';
      status.className = 'badge badge-connected';
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

// Play/Stop handlers - ALL PLAYERS CAN CONTROL
async function handlePlay() {
  if (!strudelInitialized) {
    await initializeStrudel();
  }
  
  if (isPlaying) {
    // Stop
    if (hush) hush();
    else if (evaluate) evaluate('hush()');
    isPlaying = false;
    updatePlayButton();
    
    // Sync play state to peers
    if (isConnected && room && room.actions) {
      try {
        room.actions.sendPlayState([false, isHost]);
      } catch (e) {
        console.warn('Failed to sync play state:', e);
      }
    }
  } else {
    // Play - evaluate mixed code locally (everyone hears the same mix)
    isPlaying = true;
    updatePlayButton();
    
    // Evaluate mixed code (all players do this locally)
    evaluateMixedCode();
    
    // Sync play state to peers
    if (isConnected && room && room.actions) {
      try {
        room.actions.sendPlayState([true, isHost]);
      } catch (e) {
        console.warn('Failed to sync play state:', e);
      }
    }
  }
}

function handleStop() {
  if (hush) hush();
  else if (evaluate) evaluate('hush()');
  isPlaying = false;
  updatePlayButton();
  
  if (isConnected && room && room.actions) {
    try {
      room.actions.sendPlayState([false, isHost]);
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
  
  // Initialize our peer ID immediately (will be set when room connects, but we need placeholder)
  if (!ourPeerId) {
    ourPeerId = 'local-' + Math.random().toString(36).substring(2, 9);
  }
  
  // Set default player name
  if (!playerName) {
    playerName = `Player${Math.floor(Math.random() * 1000)}`;
  }
  
  // Initialize self in players map immediately so editor shows up
  players.set(ourPeerId, { name: playerName, code: '', muted: false });
  
  // Render initial self editor (before connecting)
  updatePlayersDisplay();
  
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
  
  // Preset buttons
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetType = btn.getAttribute('data-preset');
      applyPreset(presetType);
    });
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
    playerName = playerName || `Player${Math.floor(Math.random() * 1000)}`;
    roomId = urlRoomId;
    setTimeout(() => {
      initializeRoom(roomId, playerName);
    }, 1000);
  }
  
  console.log('✓ App initialized - your editor is ready!');
}

// Apply preset to local editor (appends as new pattern)
function applyPreset(presetType) {
  if (!ourPeerId) return;
  
  const editor = document.getElementById(`code-${ourPeerId}`);
  if (!editor) return;
  
  const presets = {
    kick: "sound('bd').s('bd ~ ~ ~')",
    snare: "sound('sn').s('sn ~ ~ ~')",
    hats: "sound('hh').s('hh ~ x ~ x ~ x ~')",
    melody: "n('c e g <c e g>').scale('C4:major').s('sine')",
    bass: "n('<c1 ~ ~ c1>').s('saw').gain(0.7)"
  };
  
  // Alternative: use simpler syntax if samples are mapped
  // Actually, in Strudel, 'bd', 'sn', 'hh' should work if samples are loaded
  // Let's use the standard syntax
  const presetsAlt = {
    kick: "s('bd ~ ~ ~')",
    snare: "s('sn ~ ~ ~')",
    hats: "s('hh ~ x ~ x ~ x ~')",
    melody: "n('c e g <c e g>').scale('C4:major').s('sine')",
    bass: "n('<c1 ~ ~ c1>').s('saw').gain(0.7)"
  };
  
  const newPattern = presets[presetType];
  if (!newPattern) return;
  
  // Get current code
  const currentCode = editor.value.trim();
  let newCode = '';
  
  if (!currentCode || currentCode.startsWith('//')) {
    // Empty or comment only - just add the pattern
    newCode = newPattern;
  } else {
    // Check if current code already uses stack()
    if (currentCode.includes('stack(')) {
      // Extract existing patterns from stack()
      // Simple approach: wrap current code and add new pattern
      // If it's already a stack, we need to parse it properly
      // For now, wrap everything in a new stack
      const existingPatterns = currentCode.replace(/^setcps\([^)]+\)\s*\n?/i, '').trim();
      newCode = `stack(\n  ${existingPatterns},\n  ${newPattern}\n)`;
    } else {
      // Current code is a single pattern - wrap both in stack()
      newCode = `stack(\n  ${currentCode},\n  ${newPattern}\n)`;
    }
  }
  
  // Add setcps if not present
  if (!newCode.includes('setcps')) {
    newCode = 'setcps(1)\n' + newCode;
  }
  
  // Update editor
  editor.value = newCode;
  
  // Store locally
  if (players.has(ourPeerId)) {
    players.get(ourPeerId).code = newCode;
  }
  
  // Sync to peers
  if (isConnected) {
    setTimeout(() => {
      syncPlayerData();
    }, 100);
  }
  
  // If playing, re-evaluate
  if (isPlaying) {
    evaluateMixedCode();
  }
  
  // Focus editor
  editor.focus();
  
  console.log('✓ Preset applied:', presetType);
}

// Start app
init();

