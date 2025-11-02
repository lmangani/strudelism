# 🎵 Strudelism - Multi-Player Collaborative Strudel Host

A web-based live coding environment for [Strudel](https://strudel.cc/) that enables **real-time collaborative music creation** with multiple composers using peer-to-peer (P2P) synchronization.

## 🌟 Features

### Multi-Player Collaboration
- **P2P Synchronization**: Real-time collaboration using WebRTC via Trystero
- **Room-Based Sessions**: Join or create sessions with unique room IDs
- **URL Sharing**: Share room URLs for instant invites - room ID auto-added to URL
- **Private Code Blocks**: Each player has their own code editor - code stays private
- **Automatic Pattern Mixing**: Patterns from all players are automatically mixed together
- **Real-Time Code Sync**: Direct code editing syncs to all peers instantly (with debouncing)

### Live Coding Interface
- **Block-Based UI**: Add, modify, mute, and enable Strudel blocks without typing code
- **Quick Presets**: One-click drum kits (Kick, Snare, Hi-Hat, Full Kit, House Beat, Breakbeat)
- **Embedded REPL**: Direct code editing for advanced users
- **Auto-Evaluation**: Code automatically evaluates when blocks change (if playing)
- **Comprehensive Examples**: Drum patterns, melodies, arpeggiators, chords, bass lines, synths, and effects

### Strudel Integration
- **Full Strudel Support**: All Strudel functions and patterns
- **Sample Loading**: Built-in drum samples from Tidal Cycles Dirt-Samples
- **Effects & Modulation**: Reverb, delay, filters, gain, and modulation
- **Scales & Patterns**: Support for all Strudel scales and mini-notation

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## 🎮 Usage

### Single Player Mode

1. Open the app in your browser
2. Click **"+ Add Block"** to create pattern blocks
3. Use **Quick Presets** for instant drum kits
4. Modify blocks using the UI controls
5. Click **"▶ Play"** to hear your patterns
6. Edit code directly in the **Code Editor** for advanced patterns

### Multi-Player Mode

1. Click **"🔗 Connect"** in the header
2. Enter your name and a room ID (or use auto-generated one)
3. Click **"Join Session"**
4. Share the room URL with other players (room ID is in the URL)
5. Each player can:
   - Build their own blocks (private to them)
   - Edit code directly (syncs to peers)
   - See active peers in the **Active Players** panel
6. Click **"▶ Play"** - all players' patterns will mix together automatically!

### Quick Presets

- **Kick**: Add a kick drum block
- **Snare**: Add a snare block  
- **Hi-Hat**: Add a hi-hat block
- **Full Kit**: Add kick + snare + hi-hat (3 blocks)
- **House Beat**: Add kick + hi-hat pattern (2 blocks)
- **Breakbeat**: Add kick + snare + hi-hat breakbeat (3 blocks)

### Block Types

- **Note Pattern**: Melodic patterns with scales
- **Drum Sample**: Sample-based drum patterns
- **Synth**: Synthesizer with waveform options
- **Effect**: Reverb, delay, filters, gain
- **Modulation**: Animated parameter changes
- **Structure**: Pattern transformations (stack, sometimes, every)

## 🏗️ Architecture

### P2P Communication
- **Library**: [Trystero](https://github.com/dmotz/trystero) for WebRTC signaling
- **Strategy**: IPFS (no signup required) with Firebase fallback
- **Data Sync**:
  - Block metadata (type, params, mute state) - no code shared
  - Custom code (when players edit code directly)
  - Both sync separately for flexibility

### Pattern Mixing
- **Block Mode**: Combines all players' blocks using `stack()`
- **Code Mode**: Combines custom code from all players
- **Auto-Detection**: Automatically detects which mode players are using
- **Real-Time**: Updates automatically when any player changes blocks or code

### URL Management
- **Auto-Generation**: Room ID automatically created if none in URL
- **URL Sharing**: Room ID stored in URL query parameter (`?room=abc123`)
- **Browser Navigation**: Handles back/forward buttons
- **One-Click Copy**: "Share Room" button copies full URL to clipboard

## 📦 Dependencies

- **@strudel/web**: Strudel audio programming language
- **trystero**: P2P WebRTC synchronization
- **vite**: Build tool and dev server

## 🔧 Configuration

### P2P Signaling

The app uses IPFS by default (no configuration needed). For production, you can configure Firebase:

```javascript
// In main.js, update initializeRoom() config
const config = {
  // Firebase config
  firebaseApp: firebase.initializeApp({ /* your config */ })
};
```

## 🚢 Deployment

The app is static and can be deployed to:
- GitHub Pages (configured with GitHub Actions)
- Netlify
- Vercel
- Any static hosting service

See `DEPLOY.md` for detailed deployment instructions.

## 🎯 Use Cases

- **Live Performances**: Multiple composers playing together
- **Collaborative Jams**: Real-time musical collaboration
- **Learning**: Experiment with Strudel patterns with others
- **Remote Sessions**: Collaborate over the internet
- **Live Coding Shows**: Multiple performers in sync

## 🔒 Privacy

- **No Server Required**: All communication is peer-to-peer
- **Private Code**: Your code blocks and custom code are not shared (only patterns are mixed)
- **Encrypted**: Trystero uses end-to-end encryption for P2P connections
- **No Data Collection**: No analytics, no tracking, no data stored

## 🐛 Troubleshooting

### Connection Issues
- **Can't connect**: Check that IPFS signaling server is accessible
- **Peers not showing**: Ensure all players use the same room ID
- **No sound**: Check browser permissions for audio

### Code Sync Issues
- **Code not syncing**: Wait 500ms after typing (debouncing)
- **Patterns not mixing**: Ensure players are connected and have active blocks/code

### Sample Loading
- **Samples not found**: Samples load automatically on startup
- **Missing sounds**: Check console for sample loading errors

## 📚 Resources

- [Strudel Documentation](https://strudel.cc/)
- [Trystero Documentation](https://github.com/dmotz/trystero)
- [Tidal Cycles Patterns](https://tidalcycles.org/)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use and modify as needed.

---

**Built with ❤️ for the live coding community**
