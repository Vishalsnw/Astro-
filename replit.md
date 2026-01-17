# Astro Guru - AI Kundli & Problem Solver App

## Overview

Astro Guru is an AI-powered astrology application that generates Vedic kundli-based insights and solutions. The app collects user birth details and personal questions, then leverages the DeepSeek API to provide personalized astrological guidance including personality analysis, life insights, and remedies.

The application follows a simple user flow:
1. User enters birth details (name, DOB, time, place, gender)
2. User submits a personal question or concern
3. App sends structured prompt to DeepSeek API
4. Results are displayed in formatted sections (Kundli Overview, Life Analysis, Remedies)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Pattern**: RESTful backend service that acts as a proxy to the DeepSeek AI API
- **Environment Management**: dotenv for configuration and API key management

### Frontend Architecture
- The specification calls for a Kotlin Android application, but the current repository contains a Node.js backend
- The backend will serve as an API layer that the Android client communicates with
- Consider implementing a web-based frontend as an alternative or companion to the Android app

### API Integration Pattern
- **Prompt Engineering**: Structured prompts sent to DeepSeek API that include:
  - System instruction defining the AI as a Vedic astrologer
  - User birth details for kundli analysis
  - User's specific question or concern
  - Guidelines for response format and tone (non-fear-based)

### Data Flow
1. Client submits form data to Express backend
2. Backend constructs structured prompt with birth details and question
3. Backend calls DeepSeek API using axios
4. Response is parsed and returned to client in sectioned format

### Response Structure
The API response should be formatted into three sections:
- Kundli Overview (personality, strengths, weaknesses)
- Current Life Analysis (contextual to user's question)
- Remedies & Solutions (practical, behavioral, spiritual guidance)

## External Dependencies

### Third-Party Services
- **DeepSeek API**: Primary AI service for generating astrological insights and kundli analysis
  - Requires API key stored in environment variables
  - Used for natural language generation of astrological content

### NPM Dependencies
- **express** (v5.2.1): Web server framework for API endpoints
- **axios** (v1.13.2): HTTP client for DeepSeek API communication
- **dotenv** (v17.2.3): Environment variable management for API keys and configuration

### Environment Variables Required
- `DEEPSEEK_API_KEY`: Authentication key for DeepSeek API access