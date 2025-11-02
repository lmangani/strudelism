# Quick Start Guide

## Getting Up and Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The app will open automatically at `http://localhost:3000`

## First Steps

1. **Add a Block:**
   - Click the "+ Add Block" button
   - Select a block type (e.g., "Sample" for drums, "Note Pattern" for melodies)

2. **Modify Parameters:**
   - Click on any parameter field in a block
   - Edit the values (e.g., change pattern from "x ~ x ~" to "x x x ~")

3. **See the Code:**
   - Watch the Code Editor panel update automatically
   - The Strudel code is generated from your blocks

4. **Play Music:**
   - Click "▶ Play" to start
   - Click "⏹ Stop" to stop
   - Click "Evaluate" in the Code Editor to run code directly

5. **Try Examples:**
   - Click "📚 Examples" to see documentation and examples
   - Click "📥 Load Preset" to try example patterns

## Tips

- **Mute blocks** to temporarily disable them without deleting
- **Enable/Disable** blocks to toggle them on/off
- **Edit code directly** if you need more control
- **Combine multiple blocks** to create complex patterns
- **Load presets** from GitHub/Gist URLs to share patterns

## Example Workflow

1. Add a "Sample" block with pattern "x ~ x ~" (kick drum)
2. Add another "Sample" block with pattern "~ ~ x ~" (snare)
3. Add a "Note Pattern" block for a melody
4. Add an "Effect" block for reverb
5. Click Play!

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for static hosting on:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

