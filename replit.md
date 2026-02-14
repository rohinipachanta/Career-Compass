# Achievement Tracker

## Overview

A personal achievement tracking application that allows users to record professional milestones and personal accomplishments. Users can log achievements with dates and optionally receive AI-powered coaching feedback on their entries. The app features a clean, minimalist design focused on helping users build a record of their wins.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Animations**: Framer Motion for page transitions and list animations

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Session-based auth using Passport.js with Local Strategy
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: scrypt hashing with timing-safe comparison

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - contains users and achievements tables
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod

### Shared Code Structure
- **Location**: `shared/` directory contains code shared between client and server
- **Schema**: Database models and Zod validation schemas
- **Routes**: API route definitions with type-safe request/response schemas

### AI Integration
- **Coaching Feature**: OpenAI GPT-4o-mini integration for achievement coaching responses
- **Rate Limiting**: 5 coaching requests per user limit

### Gamification System
- **XP Points**: Users earn 10 XP per achievement logged
- **Levels**: Users level up every 50 XP (Level = floor(XP / 50) + 1)
- **Badges**: Automatic badge awards for milestones (first_achievement, five_achievements)
- **Progress Bar**: Visual XP progress indicator in the header

### Security Features
- **Achievement Encryption**: AES-256-GCM encryption for achievement titles (optional, enabled with ENCRYPTION_KEY)
- **Session Security**: PostgreSQL-backed sessions with 30-day expiry
- **Password Security**: scrypt hashing with timing-safe comparison

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database operations and schema management

### AI Services
- **OpenAI API**: Used for coaching responses

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `OPENAI_API_KEY`: OpenAI API key for coaching feature
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 5000)

### Key npm Packages
- Frontend: react, @tanstack/react-query, wouter, react-hook-form, framer-motion
- Backend: express, passport, express-session, drizzle-orm
- Shared: zod, drizzle-zod
- UI: Full shadcn/ui component suite with Radix UI primitives