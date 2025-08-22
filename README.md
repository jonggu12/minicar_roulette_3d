# MiniRoulette 3D

A 3D racing-based random selection tool that spawns mini cars based on input names, runs an AI-controlled race, and determines winners through fair racing mechanics. Perfect for streamers, educators, and content creators who need engaging, transparent, and broadcast-friendly random selection.

## Features

- **Fair Random Selection**: Transparent seed-based randomness with commit/reveal protocol
- **3D Racing Simulation**: Engaging visual experience with mini car racing
- **Weighted Entries**: Support for weighted probability entries (e.g., "John*3, Mary, Bob*2")
- **OBS Integration**: Browser source compatible for streaming overlays
- **Multiple Race Modes**: Sprint, Podium, Knockout, and Tournament modes
- **Reproducible Results**: Identical inputs produce identical results for verification

## Quick Start

### Prerequisites

- Node.js 18+ 
- Modern web browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/jonggu12/minicar_roulette_3d.git
cd minicar_roulette_3d

# Install dependencies (frontend)
cd frontend
npm install

# Install dependencies (backend)
cd ../backend
npm install

# Start development servers
npm run dev
```

### Basic Usage

1. **Input Names**: Enter participant names (optionally with weights: "name*3")
2. **Configure Race**: Select track and race mode
3. **Generate Seed**: System creates fairness commit hash
4. **Start Race**: Watch the 3D race unfold
5. **View Results**: See winner and download race data

## Project Structure

```
├── frontend/          # React Three Fiber 3D frontend
├── backend/           # API and race logic backend  
├── shared/           # Shared utilities and types
└── docs/             # Documentation and guides
```

## Tech Stack

- **Frontend**: React Three Fiber, Next.js, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL
- **3D Engine**: Three.js with Rapier physics
- **State Management**: Zustand

## Race Modes

- **Sprint**: Single lap, first place wins
- **Podium**: Top N winners (configurable)
- **Knockout**: Eliminate last place each lap
- **Tournament**: Bracket-style elimination

## Fairness & Transparency

MiniRoulette 3D uses a commit/reveal protocol to ensure fair random selection:

1. Pre-race seed generation with SHA256 commit hash
2. Public display of commit hash before race starts
3. Post-race seed reveal for verification
4. Reproducible results for third-party validation

## Development

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests  
cd backend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@miniroulette3d.com
- 💬 Discord: [Community Server](https://discord.gg/miniroulette3d)
- 📖 Documentation: [docs.miniroulette3d.com](https://docs.miniroulette3d.com)

## Roadmap

- [x] MVP: Basic 3D racing with fair selection
- [ ] Beta: Advanced tracks and race modes
- [ ] Production: Custom branding and enterprise features

---

**Built for fairness, designed for engagement.** 🏎️✨