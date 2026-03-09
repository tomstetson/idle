# Changelog

## Version 8 - 2026-03-09

A cleanup and hardening release focused on polish, security verification, and removing upstream remnants for a cleaner alpha experience.

- Fixed header logo sizing across all screens — the brand mark now displays at consistent size on phone, tablet, and sidebar views
- Completed full security re-audit with zero critical or high-severity findings — all previous security patches verified
- Removed upstream test data and developer references from CLI fixtures for cleaner codebase
- Fixed server package metadata to point to correct repository
- Polished changelog copy for professional in-app display
- Updated brand generation scripts to reflect Idle's own design identity

## Version 7 - 2026-03-09

Welcome to Idle Alpha v0.1.0 — a fresh start with a new identity. All packages have been unified at version 0.1.0, with a completely redesigned brand and improved security across the board.

- Updated to brand v3 with the new prompt mark logo (brush chevron + cursor between bars)
- Added custom Northglass font stack: Space Grotesk for headings, Inter for body text, JetBrains Mono for code
- Fixed logotype display on dark theme with proper transparent PNG assets
- Added blinking green terminal cursor animation on the login screen
- Improved header mark layout with proper sizing and alignment
- Fixed security issue where decrypted session content could leak to console logs
- Fixed DEK cache to only write on fresh key generation, preventing session resume corruption
- Deployed web app pipeline with one-command deploys to idle.northglass.io
- Reset all package versions to v0.1.0 for clean alpha launch

## Version 6 - 2026-03-07

This release brings a suite of quality-of-life improvements focused on better session management, richer message display, and smarter push notifications — making your Claude Code sessions feel more polished and responsive.

- Added collapsible thinking block display with a dedicated settings toggle, so you can see Claude's reasoning process when enabled
- Added message timestamps showing when each message was sent, visible on both user and agent messages
- Improved slash command autocomplete with dynamic descriptions pulled from the connected CLI and expanded static fallback descriptions
- Added session grouping by machine — inactive sessions now collapse under their machine name with OS icons and session counts
- Added push notifications for new messages when the app is in the background, with automatic stale token cleanup
- Sessions now automatically get a title even when Claude doesn't set one, using a smart fallback based on your project and first message
- Fixed inverted scroll on web — chat messages now scroll correctly in web browsers
- Added session rename from the session info screen with encrypted metadata updates
- Removed dead code and cleaned up unused autocomplete hooks

## Version 5 - 2025-12-22

This release expands AI agent support and refines the voice experience, while improving markdown rendering for a better chat experience.

- Added experimental Gemini support via ACP protocol alongside improved Codex stability
- Simplified model configuration — removed per-agent model settings in favor of CLI-side defaults for easier maintenance
- Added BYOK (Bring Your Own Key) support for ElevenLabs voice — connect your own API key to manage voice conversation costs
- Improved markdown table rendering in chat with properly formatted tables replacing ASCII pipes

## Version 4 - 2025-09-12

This release revolutionizes remote development with Codex integration and Daemon Mode, enabling instant AI assistance from anywhere. Start coding sessions with a single tap while maintaining complete control over your development environment.

- Introduced Codex support for advanced AI-powered code completion and generation capabilities.
- Implemented Daemon Mode as the new default, enabling instant remote session initiation without manual CLI startup.
- Added one-click session launch from mobile devices, automatically connecting to your development machine.
- Added ability to connect anthropic and gpt accounts to account

## Version 3 - 2025-08-29

This update introduces seamless GitHub integration, bringing your developer identity directly into Idle while maintaining our commitment to privacy and security.

- Added GitHub account connection through secure OAuth authentication flow
- Integrated profile synchronization displaying your GitHub avatar, name, and bio
- Implemented encrypted token storage on our backend for additional security protection
- Enhanced settings interface with personalized profile display when connected
- Added one-tap GitHub disconnect functionality with confirmation protection
- Improved account management with clear connection status indicators

## Version 2 - 2025-06-26

This update focuses on seamless device connectivity, visual refinements, and intelligent voice interactions for an enhanced user experience.

- Added QR code authentication for instant and secure device linking across platforms
- Introduced comprehensive dark theme with automatic system preference detection
- Improved voice assistant performance with faster response times and reduced latency
- Added visual indicators for modified files directly in the session list
- Implemented preferred language selection for voice assistant supporting 15+ languages

## Version 1 - 2025-05-12

Welcome to Idle - your secure, encrypted mobile companion for Claude Code. This inaugural release establishes the foundation for private, powerful AI interactions on the go.

- Implemented end-to-end encrypted session management ensuring complete privacy
- Integrated intelligent voice assistant with natural conversation capabilities
- Added experimental file manager with syntax highlighting and tree navigation
- Built seamless real-time synchronization across all your devices
- Established native support for iOS, Android, and responsive web interfaces