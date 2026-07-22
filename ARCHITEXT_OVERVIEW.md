# Architext Project Overview

## 1. What Architext Is

Architext is an AI-powered architectural floor plan generator. A user
describes a floor plan in natural language, and the system generates an
SVG floor plan with both 2D and 3D visualization.

The project ships as a mobile application backed by two services:

-   An authentication and data backend
-   An ML-driven layout generation service

Originally built for a university project defense (mid-July 2026), the
project is now being evolved into a production-ready application.

## 2. Architecture & Technology Stack

  -----------------------------------------------------------------------
  Layer                 Technology                       Notes
  --------------------- -------------------------------- ----------------
  Mobile App            React Native / Expo SDK 54 /     Demoed via Expo
                        TypeScript (`architext-app`)     Go; EAS Android
                                                         APK build in
                                                         progress

  Backend               Spring Boot / Java 21            Auth, JWT,
                        (`architext-backend`)            history, saved
                                                         plans, proxying.
                                                         Uses Lombok.

  ML / Layout Service   Python Flask                     Layout
                                                         generation, SVG
                                                         rendering, NLP
                                                         parsing

  Database              PostgreSQL                       Hosted on Render

  Hosting               Render (Free Tier)               Spring Boot and
                                                         Flask deployed
                                                         separately
  -----------------------------------------------------------------------

### Repository

Project root:

`C:\Users\gideo\OneDrive\Documentos\ARCHITEXT`

Protected `main` and `dev` branches require pull requests.

### Development Principle

Changes should only replace existing functionality when they improve
security, scalability, maintainability, performance, or deployment
readiness.

## 3. Current Project Status

### Spring Boot Backend

-   URL: https://architext-backend-3hdd.onrender.com
-   JWT Authentication
-   Login
-   History
-   Saved plans

### Flask Service

-   URL: https://architext-flask.onrender.com
-   NLP parsing
-   Layout generation
-   SVG rendering
-   Protected with an `X-Internal-Key` shared-secret header

### Current Routing

The mobile app currently calls the Flask service directly for layout
generation due to an unresolved Spring Boot outbound `RestTemplate`
issue on Render.

Mitigation:

`JAVA_TOOL_OPTIONS=-Xmx350m`

All other requests continue through Spring Boot.

### Cold Starts

UptimeRobot pings both services every 10 minutes to reduce Render
free-tier cold starts.

### CORS

Current configuration allows all origins with credentials enabled.
Configurable allowed origins exist but are not yet wired into the
application.

### Mobile App

-   Expo Go demo completed
-   EAS Android APK build in progress
-   Package: `com.architext.app`

### Assets

-   icon.png
-   adaptive-icon.png
-   splash-icon.png
-   favicon.png
-   lockup_transparent.png

### SVG Export

Uses:

-   expo-file-system/legacy
-   expo-sharing

### Save to Photos

SVGs are rasterized using `SvgXml` + `toDataURL()` and saved with
`expo-media-library`.

Implementation is located in `HomeScreen.tsx`.

### Secrets

Secrets are stored in `architext-backend/.env` using `spring-dotenv`
v4.0.0 and are excluded from Git.

## Production Readiness Summary

### Completed

-   End-to-end deployment
-   JWT authentication
-   PostgreSQL integration
-   Flask layout generation
-   SVG generation
-   SVG export
-   Save to Photos
-   Expo mobile app
-   Android APK configuration
-   Shared-secret protection
-   Cold-start mitigation
-   Asset generation
-   Environment variable management

### Technical Debt

-   Resolve Spring Boot → Flask proxy failure
-   Replace permissive CORS
-   Remove Render free-tier workarounds
-   Continue memory optimization

## Goal

Transform Architext into a secure, scalable, maintainable,
production-ready AI-powered architectural design platform.
