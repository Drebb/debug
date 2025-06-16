# Convex Functions Documentation

## Overview

This document provides a comprehensive overview of all functions in the Convex backend, their purposes, usage status, and recommendations for optimization.

## Table of Contents

- [Authentication & Users](#authentication--users)
- [Events Management](#events-management)
- [Guest Management](#guest-management)
- [Gallery Management](#gallery-management)
- [Analytics](#analytics)
- [Configuration](#configuration)
- [Utilities](#utilities)
- [HTTP Endpoints](#http-endpoints)

---

## Authentication & Users

### File: `users.ts`

#### ✅ **userLoginStatus** (Query)

- **Description**: Checks the current user's login status including JWT token and Clerk user sync
- **Usage**: ✅ **ACTIVELY USED** - Essential for authentication flow
- **Recommendation**: **KEEP** - Core authentication function

#### ✅ **currentUser** (Query)

- **Description**: Retrieves the current user's information including preferences and Clerk data
- **Usage**: ✅ **ACTIVELY USED** - Used throughout the app for user context
- **Recommendation**: **KEEP** - Core user management function

#### ✅ **getUser** (Internal Query)

- **Description**: Internal function to get user by Clerk user ID
- **Usage**: ✅ **ACTIVELY USED** - Used by webhooks and internal processes
- **Recommendation**: **KEEP** - Required for Clerk integration

#### ✅ **updateOrCreateUser** (Internal Mutation)

- **Description**: Creates new user or updates existing user data from Clerk webhooks
- **Usage**: ✅ **ACTIVELY USED** - Used by Clerk webhooks in `http.ts`
- **Recommendation**: **KEEP** - Essential for user sync

#### ✅ **deleteUser** (Internal Mutation)

- **Description**: Deletes user by Clerk user ID with safety checks for existing events
- **Usage**: ✅ **ACTIVELY USED** - Used by Clerk webhooks in `http.ts`
- **Recommendation**: **KEEP** - Required for GDPR compliance

---

## Events Management

### File: `events.ts`

#### ✅ **createEvent** (Mutation)

- **Description**: Creates a new event with pricing calculations, validation, and business logic
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/create/page.tsx`
- **Recommendation**: **KEEP** - Core business function

#### ✅ **getAllEvents** (Query)

- **Description**: Retrieves all events for a specific user with ownership verification
- **Usage**: ✅ **ACTIVELY USED** - Used in dashboard and event listings
- **Recommendation**: **KEEP** - Essential for event management

#### ✅ **getEventById** (Query)

- **Description**: Retrieves specific event by ID with ownership verification
- **Usage**: ✅ **ACTIVELY USED** - Used extensively in event detail pages
- **Recommendation**: **KEEP** - Core function for event access

#### ✅ **updateEvent** (Mutation)

- **Description**: Updates event information with validation
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/edit-event/page.tsx`
- **Recommendation**: **KEEP** - Essential for event editing functionality

#### ✅ **deleteEvent** (Mutation)

- **Description**: Deletes event with cascade deletion of related data
- **Usage**: ✅ **ACTIVELY USED** - Used in `/dashboard/page.tsx` and `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for event deletion functionality

---

## Guest Management

### File: `guests.ts`

#### ✅ **checkExistingRegistration** (Query)

- **Description**: Checks if a device (visitor ID) is already registered for an event
- **Usage**: ✅ **ACTIVELY USED** - Used in `/camera/[id]/page.tsx`
- **Recommendation**: **KEEP** - Prevents duplicate registrations

#### ✅ **saveGuestRecord** (Mutation)

- **Description**: Saves new guest registration with fingerprint validation and duplicate prevention
- **Usage**: ✅ **ACTIVELY USED** - Used in guest registration and camera page
- **Recommendation**: **KEEP** - Core guest registration function

#### ✅ **getGuestList** (Query)

- **Description**: Retrieves all guests for an event with ownership verification
- **Usage**: ✅ **ACTIVELY USED** - Used in event management pages
- **Recommendation**: **KEEP** - Essential for guest management

#### ✅ **updateGuestRecord** (Mutation)

- **Description**: Updates guest information with ownership verification
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/edit-guest/[guestId]/page.tsx`
- **Recommendation**: **KEEP** - Essential for guest editing functionality

#### ✅ **deleteGuestRecord** (Mutation)

- **Description**: Deletes guest and associated gallery files with ownership verification
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for guest deletion with proper cleanup

#### ❌ **getGuestByFingerprint** (Query)

- **Description**: Retrieves guest by fingerprint for authentication
- **Usage**: ❌ **NOT USED** - No usage found in codebase
- **Recommendation**: **REMOVE** - Function is not being used anywhere

---

## Gallery Management

### File: `gallery.ts`

#### ✅ **generateUploadURL** (Mutation)

- **Description**: Generates secure upload URL for file storage
- **Usage**: ✅ **ACTIVELY USED** - Used in `/camera/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for file uploads

#### ✅ **uploadToGalleryByGuest** (Mutation)

- **Description**: Allows guests to upload files to event gallery with validation
- **Usage**: ✅ **ACTIVELY USED** - Used in camera/upload functionality
- **Recommendation**: **KEEP** - Core upload functionality

#### ✅ **deleteFromGallery** (Mutation)

- **Description**: Deletes gallery item with ownership verification and file cleanup
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx` and `/camera/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for gallery management with proper cleanup

#### ✅ **deleteAllImagesFromEvent** (Mutation)

- **Description**: Bulk deletes all gallery items for an event
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for bulk gallery cleanup functionality

#### ❌ **getFileUrl** (Query)

- **Description**: Gets secure URL for file display with ownership verification
- **Usage**: ❌ **NOT USED** - No usage found in codebase
- **Recommendation**: **REMOVE** - Function is not being used anywhere

#### ❌ **getGalleryByEvent** (Query)

- **Description**: Retrieves all gallery items for an event with ownership verification
- **Usage**: ❌ **NOT USED** - No usage found in codebase, similar functionality exists
- **Recommendation**: **REMOVE** - Function is not being used anywhere

#### ✅ **getGalleryByGuest** (Query)

- **Description**: Retrieves gallery items uploaded by specific guest with metadata
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for guest-specific gallery views

---

## Analytics

### File: `analytics.ts`

#### ✅ **getAllEventCount** (Query)

- **Description**: Counts total events for a user
- **Usage**: ✅ **ACTIVELY USED** - Used in `/dashboard/page.tsx`
- **Recommendation**: **KEEP** - Core dashboard metric

#### ✅ **getAllGuestCountWhole** (Query)

- **Description**: Counts total guests across all user's events
- **Usage**: ✅ **ACTIVELY USED** - Used in `/dashboard/page.tsx`
- **Recommendation**: **KEEP** - Core dashboard metric

#### ✅ **getAllGuestCountPerEvent** (Query)

- **Description**: Counts guests for a specific event
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for event analytics display

#### ✅ **getAllTotalUploadWhole** (Query)

- **Description**: Counts total uploads across all user's events
- **Usage**: ✅ **ACTIVELY USED** - Used in `/dashboard/page.tsx`
- **Recommendation**: **KEEP** - Core dashboard metric

#### ✅ **getAllTotalUploadPerEvent** (Query)

- **Description**: Counts uploads for a specific event
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for event analytics display

---

## Configuration

### File: `guestPackages.ts`

#### ✅ **getGuestPackageTiers** (Query)

- **Description**: Retrieves all available guest package tiers for pricing
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/create/page.tsx`, `/event/[id]/edit-event/page.tsx`, and `/event/[id]/page.tsx`
- **Recommendation**: **KEEP** - Essential for event pricing and configuration

### File: `captureLimits.ts`

#### ✅ **getCaptureLimits** (Query)

- **Description**: Retrieves all available capture limit plans for pricing
- **Usage**: ✅ **ACTIVELY USED** - Used in `/event/create/page.tsx` and `/event/[id]/edit-event/page.tsx`
- **Recommendation**: **KEEP** - Essential for event pricing and configuration

### File: `auth.config.ts`

- **Description**: Clerk authentication configuration
- **Usage**: ✅ **REQUIRED** - Core auth setup
- **Recommendation**: **KEEP** - Required for authentication

---

## Utilities

### File: `utils.ts`

#### ✅ **verifyEventOwnership** (Helper)

- **Description**: Verifies user owns an event before allowing operations
- **Usage**: ✅ **ACTIVELY USED** - Used throughout the codebase
- **Recommendation**: **KEEP** - Critical security function

#### ✅ **verifyGalleryOwnership** (Helper)

- **Description**: Verifies user owns gallery items before allowing operations
- **Usage**: ✅ **ACTIVELY USED** - Used in gallery functions
- **Recommendation**: **KEEP** - Critical security function

#### ✅ **verifyGuestOwnership** (Helper)

- **Description**: Verifies user owns guests before allowing operations
- **Usage**: ✅ **ACTIVELY USED** - Used in guest functions
- **Recommendation**: **KEEP** - Critical security function

#### ✅ **validateWithZod** (Helper)

- **Description**: Validates data using Zod schemas with proper error handling
- **Usage**: ✅ **ACTIVELY USED** - Used throughout for input validation
- **Recommendation**: **KEEP** - Critical for data integrity

#### ❓ **generateGalleryFilename** (Helper)

- **Description**: Generates standardized filenames for gallery items
- **Usage**: ❓ **USED IN GALLERY** - Used in gallery functions
- **Recommendation**: **KEEP** - Useful for file organization

#### ❓ **getFileMetadataWithUrl** (Helper)

- **Description**: Gets file metadata with secure URL for display
- **Usage**: ❓ **USED IN GALLERY** - Used in gallery functions
- **Recommendation**: **KEEP** - Useful for file display

---

## HTTP Endpoints

### File: `http.ts`

#### ✅ **handleClerkWebhook** (HTTP Action)

- **Description**: Handles Clerk user webhooks for user creation/update/deletion
- **Usage**: ✅ **ACTIVELY USED** - Required for Clerk integration
- **Recommendation**: **KEEP** - Essential for user sync

#### ✅ **handleClerkWebhookOptions** (HTTP Action)

- **Description**: Handles CORS preflight requests for webhooks
- **Usage**: ✅ **ACTIVELY USED** - Required for CORS compliance
- **Recommendation**: **KEEP** - Required for webhook functionality

---

## Summary & Recommendations

### ✅ **Functions to Keep (High Priority)**

- All user management functions
- All event CRUD functions (create, get, update, delete)
- All guest functions (save, check, list, update, delete)
- All gallery upload and management functions (upload, delete, bulk delete)
- All analytics functions (dashboard and per-event)
- All configuration functions (guest packages, capture limits)
- All security utility functions
- All HTTP webhook handlers

### ❌ **Functions to Remove (High Priority)**

- `getGuestByFingerprint` - No usage found in codebase
- `getFileUrl` - No usage found in codebase
- `getGalleryByEvent` - No usage found in codebase, similar functionality exists elsewhere

### 🔍 **Immediate Actions Needed**

1. **Remove unused functions** (`getGuestByFingerprint`, `getFileUrl`, `getGalleryByEvent`)
2. **Clean up imports** and references to removed functions
3. **Consider consolidating** similar gallery functions if needed

### 💡 **Optimization Opportunities**

1. **Combine related queries** where possible to reduce round trips
2. **Add caching** for configuration data (guest packages, capture limits)
3. **Implement batch operations** for bulk gallery operations
4. **Add pagination** for large guest lists and gallery items

### 🛡️ **Security Assessment**

- ✅ **Excellent** ownership verification throughout
- ✅ **Good** input validation with Zod
- ✅ **Proper** authorization checks
- ✅ **Secure** file handling with proper cleanup

### 📊 **Code Quality Assessment**

- ✅ **Consistent** error handling
- ✅ **Good** separation of concerns
- ✅ **Proper** type safety with Convex validators
- ✅ **Well-structured** with utility functions
- ✅ **High usage rate** - Most functions are actively used
- 🟡 **Some cleanup needed** - 3 unused functions identified for removal
