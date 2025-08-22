# MiniRoulette 3D - Product Requirements Document

## 1. Product Overview

### Vision Statement
Create a 3D racing-based random selection tool that spawns mini cars based on input names, runs an AI-controlled race, and determines winners through fair racing mechanics. Perfect for streamers, educators, and content creators who need engaging, transparent, and broadcast-friendly random selection.

### Core Concept
Input names (with optional weights) → Spawn mini cars → AI-controlled race with identical rules → First car to cross finish line wins. Options for weighted probability (name*number) or equal probability selection.

### Target Audience
- **Streamers & Content Creators**: Need engaging random selection for giveaways, viewer participation
- **Educators & Trainers**: Classroom activities, student selection, interactive lessons
- **Event Organizers**: Fair and entertaining selection methods for contests

## 2. Product Roadmap

### MVP Phase (2-3 weeks)
**Core Features:**
- Basic race implementation with single oval track
- Name input with weight parsing (format: "name*3, name2, name3*2")
- Sprint mode (single lap, winner takes all)
- Seed commit/reveal system for fairness verification
- OBS browser source compatibility
- Basic replay functionality

### Beta Phase 
**Enhanced Features:**
- User authentication and dashboard
- Remote participant collection
- Multiple track presets (Neon City, Canyon Rally, Arcade Oval)
- Advanced race modes (Podium top-N, Knockout, Relay)
- Live voting and interaction features
- Comprehensive documentation

### Production Phase
**Premium Features:**
- Custom branding and white-labeling
- Tournament bracket system
- VRF (Verifiable Random Function) integration
- Advanced cinematic camera controls
- Team workspace management
- Subscription billing system

## 3. Core Features & Requirements

### 3.1 Entry System
- **Input Format**: Support "name*weight" notation (e.g., "John*3, Mary, Bob*2")
- **Normalization**: Parse and validate entries, handle duplicates
- **Weight Modes**: 
  - Lottery Mode: Spawn multiple cars per weighted entry
  - Probability Mode: Single car per entry with statistical weighting

### 3.2 Race Mechanics
- **Fair AI**: Identical AI parameters for all cars
- **Physics**: Consistent physics engine (Rapier/Ammo.js)
- **Track System**: Spline-based waypoint following with PID steering
- **Collision**: Fair collision detection with identical material properties

### 3.3 Fairness System
- **Seed Management**: SHA256(serverSalt + entrants + timestamp)
- **Commit/Reveal**: Pre-race commit hash → post-race seed reveal
- **Reproducibility**: Identical inputs + seed = identical results
- **Verification**: Downloadable race data for third-party verification

### 3.4 Visual & Audio
- **Art Style**: Low-poly with toon shading, bloom effects
- **Car Customization**: Auto-generated colors via name hashing (HSL mapping)
- **Sound Design**: Start signals, drift sounds, finish flags, crowd cheers
- **Camera Work**: Dynamic tracking, photo-finish close-ups, slow-motion

### 3.5 Broadcasting Integration
- **OBS Compatibility**: Transparent background, 1080p/60fps presets
- **Embed Modes**: Minimal UI for streaming overlays
- **Result Cards**: Downloadable winner announcements
- **Live Controls**: Real-time race control for live streams

## 4. Technical Architecture

### 4.1 Frontend Stack
- **3D Rendering**: React Three Fiber (R3F) + drei helpers
- **Physics**: Rapier (WASM) or Ammo.js
- **State Management**: Zustand for client state
- **UI Framework**: Next.js with Tailwind CSS

### 4.2 Backend Stack
- **API**: Next.js Route Handlers or tRPC
- **Database**: PostgreSQL (Supabase) for production, SQLite for MVP
- **Real-time**: WebSockets/Ably/Pusher for live features
- **Storage**: Object storage for race recordings and assets

### 4.3 Performance Requirements
- **Target**: 60fps on desktop, 30fps on mobile
- **Scalability**: Support up to 64 cars (MVP), 128 cars (Pro)
- **Optimization**: Instancing, LOD, material batching, dynamic resolution

## 5. User Experience Flow

### 5.1 MVP User Flow
1. **Entry**: Input participant names with optional weights
2. **Configuration**: Select race mode, track, and fairness options
3. **Commit**: Generate and display seed commit hash
4. **Race**: Countdown → Start → AI racing → Photo finish
5. **Results**: Winner announcement → Result export → Replay link

### 5.2 Advanced Flows
- **Remote Entry**: Share link → Collect entries → Batch import
- **Tournament**: Multi-round elimination brackets
- **Live Voting**: Audience selects track/events for next race

## 6. Race Modes

### Sprint Mode (MVP)
- Single lap race
- First place wins
- Immediate finish on winner

### Podium Mode
- Top N winners (configurable)
- Full race completion
- Ranked results

### Knockout Mode
- Eliminate last place each lap
- Continue until one winner
- Dramatic elimination sequence

### Relay Mode
- Team-based racing
- Car handoffs at designated points
- Team collaboration element

### Tournament Mode
- Bracket-style elimination
- Multiple race rounds
- Championship progression

## 7. Fairness & Transparency

### 7.1 Commit/Reveal Protocol
1. **Pre-race**: Generate seed, create SHA256 commit
2. **Display**: Show commit hash publicly before start
3. **Race**: Use committed seed for all random events
4. **Post-race**: Reveal original seed for verification
5. **Verification**: Allow third parties to reproduce results

### 7.2 Reproducibility
- **Deterministic Physics**: Fixed timestep, consistent parameters
- **Identical AI**: Same waypoint following, PID parameters
- **Seed-based Randomness**: All random events use committed seed
- **Export Format**: JSON with all race parameters and results

## 8. Content & Customization

### 8.1 Track Themes
- **Arcade Oval**: Simple balanced track for testing
- **Neon City**: Night theme with neon lighting and glossy asphalt
- **Canyon Rally**: Off-road with jumps and hazard events
- **Custom Generator**: Procedural spline-based track creation

### 8.2 Dynamic Events (Optional)
- **Environmental**: Wind resistance, oil slicks, speed strips
- **Interactive**: Turnstile gates, moveable obstacles
- **Audience**: Voting on track conditions or events

### 8.3 Branding (Pro)
- **Custom Colors**: Brand color schemes
- **Logo Integration**: Trackside advertising, car liveries
- **White-label**: Complete UI customization for enterprises

## 9. Analytics & Insights

### 9.1 Core Metrics
- **Usage**: Races created, participants added, results shared
- **Engagement**: Watch time, replay views, social shares
- **Performance**: Load times, frame rates, crash reports
- **Fairness**: Seed verification attempts, dispute reports

### 9.2 Business Metrics
- **Conversion**: Free to paid upgrades
- **Retention**: Weekly/monthly active users
- **Feature Adoption**: Advanced modes, premium features

## 10. Security & Privacy

### 10.1 Data Protection
- **Minimal Collection**: Only necessary race and user data
- **PII Handling**: Hash or encrypt sensitive information
- **Retention**: Automatic cleanup of old race data
- **GDPR Compliance**: Right to deletion, data portability

### 10.2 Security Measures
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Prevent spam and abuse
- **Seed Security**: Cryptographically secure random generation
- **API Security**: Authentication, authorization, request validation

## 11. Accessibility & Internationalization

### 11.1 Accessibility
- **Color Vision**: Colorblind-friendly palettes
- **Contrast**: High contrast mode option
- **Navigation**: Keyboard-only operation support
- **Screen Readers**: Proper ARIA labels and descriptions

### 11.2 Internationalization
- **Languages**: Korean, English (MVP), additional languages (Pro)
- **Localization**: Currency, date formats, cultural adaptations
- **RTL Support**: Right-to-left language compatibility

## 12. Success Metrics

### 12.1 MVP Success Criteria
- **Reproducibility**: 100% identical results for same seed+input
- **Performance**: 60fps with 64 cars on desktop
- **OBS Integration**: Successful streaming overlay implementation
- **User Adoption**: 100 active users within first month

### 12.2 Long-term Goals
- **Market Position**: Leading 3D random selection tool
- **User Base**: 10,000+ active monthly users
- **Revenue**: Sustainable subscription model
- **Ecosystem**: Third-party integrations and partnerships

## 13. Risk Assessment

### 13.1 Technical Risks
- **Performance**: 3D rendering performance on various devices
- **Compatibility**: Browser and device compatibility issues
- **Fairness**: Potential disputes over randomness or bias
- **Scaling**: Server costs with increased usage

### 13.2 Mitigation Strategies
- **Progressive Enhancement**: Graceful degradation for lower-end devices
- **Comprehensive Testing**: Cross-browser and device testing
- **Transparency**: Open-source fairness algorithms
- **Cost Management**: Efficient resource usage and pricing tiers

## 14. Launch Strategy

### 14.1 MVP Launch
- **Beta Testing**: Closed beta with streamers and educators
- **Documentation**: Complete setup and fairness guides
- **Community**: Discord/forum for feedback and support
- **Content**: Demo videos and use case examples

### 14.2 Marketing Channels
- **Content Creator Outreach**: Partnerships with streamers
- **Educational Markets**: School and training organizations
- **SEO**: "3D random picker", "fair lottery tool", "OBS random selection"
- **Social Proof**: Case studies and testimonials

This PRD serves as the foundation for building MiniRoulette 3D, providing clear direction for the development team while maintaining focus on fairness, engagement, and user needs.