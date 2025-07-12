# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build the application for production
- `npm run start` - Start production server on port 3001
- `npm run lint` - Run ESLint to check code quality
- `npm run docs` - Generate TypeScript documentation using TypeDoc

## Architecture Overview

This is a Next.js 14 React application serving as the frontend for Tilt's "Intelligent Desktop" - a desktop automation tool with AI capabilities.

### Key Components

**Context Architecture**: The app uses multiple React contexts in a nested hierarchy:
- `AppProvider` - Main application state, chat messages, configuration
- `TaskRunnerProvider` - Task execution and automation logic
- `TaskProvider` - Individual task management
- `PanelPreferencesProvider` - UI panel layout preferences

**Panel System**: The UI is built around a flexible panel system with:
- `BottomPanel` - Collapsible bottom panels with maximize/minimize controls
- Multiple specialized panels: action, inspector, instruction, log, task-runner, thinking
- Screenshot panels with VNC support for desktop interaction

**API Integration**: 
- Next.js API routes proxy requests to backend at `http://localhost:8000`
- Streaming chat API at `/api/v1/chat/stream`
- Health check endpoint at `/api/v1/health`
- Panels API at `/api/v1/panels`

**Key Features**:
- Computer use automation with screenshot capture
- AI chat integration with multiple providers (Anthropic, Bedrock, Vertex)
- Task execution with step-by-step workflows
- JavaScript and network inspection capabilities
- VNC panel for remote desktop control
- Dual/single view modes

### Core Technologies

- **Next.js 14** with App Router
- **React 18** with Context API for state management
- **TypeScript** for type safety
- **Tailwind CSS** for styling with custom CSS variables
- **Axios** for HTTP requests
- **Lucide React** for icons

### File Structure

- `src/app/` - Next.js app router pages and API routes
- `src/app/bottom-panel/` - Panel component system
- `src/app/screenshots/` - Screenshot capture and VNC functionality
- `src/app/task-runner/` - Task execution system
- `src/types/` - TypeScript type definitions
- `src/lib/` - Utility functions and API client
- `src/shared/` - Reusable UI components

### Development Notes

- The app expects a backend service running on port 8000
- Uses custom CSS variables for theming (`--panel-bg`, etc.)
- Implements computer use tools for desktop automation
- Screenshot functionality depends on backend integration