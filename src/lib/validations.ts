import { z } from "zod";

// Event Type enum
export const EventTypeSchema = z.enum([
  "Music Festival",
  "Automotive Event", 
  "Wedding",
  "Town Festival",
  "Birthday",
  "Graduation",
  "Reunion",
  "Conference",
  "Tradeshow",
  "Fundraiser",
  "Sporting Event",
  "Private Event",
  "Concert"
]);

// Event Status enum
export const EventStatusSchema = z.enum([
  "upcoming",
  "live",
  "past"
]);

// Guest Tier - now accepts any string since tiers are dynamic
export const GuestTierSchema = z.string().min(1, "Guest tier is required");

// Capture Plan Type enum
export const CapturePlanTypeSchema = z.enum([
  "photos-only",
  "photos-videos",
  "videos-only"
]);

// Location Schema
export const LocationSchema = z.object({
  address: z.string().min(1, "Address is required").max(200, "Address too long"),
  city: z.string().min(1, "City is required").max(100, "City name too long"),
  region: z.string().min(1, "Region/State is required").max(100, "Region name too long"),
  postal: z.string().min(1, "Postal code is required").max(20, "Postal code too long"),
  country: z.string().min(1, "Country is required").max(100, "Country name too long"),
});

// Fingerprint Schema
export const FingerprintSchema = z.object({
  visitorId: z.string().min(1, "Visitor ID is required"),
  userAgent: z.string().min(1, "User agent is required"),
});

// User Schemas
export const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  first_name: z.string().min(1, "First name is required").max(50, "First name too long").optional(),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name too long").optional(),
  clerkUser: z.any(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  userId: z.string().min(1, "User ID is required"),
});

// Guest Schemas
export const CreateGuestSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  nickname: z.string()
    .min(1, "Nickname is required")
    .max(50, "Nickname too long")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Nickname contains invalid characters"),
  email: z.string().email("Invalid email format").optional(),
  socialHandle: z.string()
    .max(50, "Social handle too long")
    .regex(/^@?[a-zA-Z0-9._-]+$/, "Invalid social handle format")
    .optional(),
  fingerprint: FingerprintSchema,
});

export const UpdateGuestSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  userId: z.string().min(1, "User ID is required"),
  nickname: z.string()
    .min(1, "Nickname is required")
    .max(50, "Nickname too long")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Nickname contains invalid characters")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  socialHandle: z.string()
    .max(50, "Social handle too long")
    .regex(/^@?[a-zA-Z0-9._-]+$/, "Invalid social handle format")
    .optional(),
  fingerprint: FingerprintSchema.optional(),
});

export const DeleteGuestSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const CheckExistingRegistrationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  baseVisitorId: z.string().min(1, "Base visitor ID is required"),
});

// Event Package Schemas
export const BasePackageSchema = z.object({
  dailyRate: z.number().min(0, "Daily rate must be positive"),
  totalDays: z.number().min(1, "Total days must be at least 1"),
  totalBasePrice: z.number().min(0, "Total base price must be positive"),
});

export const GuestPackageSchema = z.object({
  tier: GuestTierSchema,
  maxGuests: z.number().min(1, "Max guests must be at least 1").max(300, "Max guests cannot exceed 300"),
  additionalPrice: z.number().min(0, "Additional price must be positive"),
});

export const VideoPackageSchema = z.object({
  enabled: z.boolean(),
  price: z.number().min(0, "Video package price must be positive"),
});

export const AddOnsSchema = z.object({
  filter: z.boolean(),
  brandedQR: z.boolean(),
});

// Event Schemas
export const CreateEventSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string()
    .min(1, "Event name is required")
    .max(100, "Event name too long")
    .regex(/^[a-zA-Z0-9\s\-_.(),&!]+$/, "Event name contains invalid characters"),
  logo: z.string().optional(),
  eventType: EventTypeSchema,
  location: LocationSchema,
  startDate: z.number().min(Date.now() - 86400000, "Start date cannot be more than 1 day in the past"), // Allow 1 day buffer for timezone issues
  endDate: z.number(),
  status: EventStatusSchema,
  guestPackageId: z.string().min(1, "Guest package ID is required"),
  reviewMode: z.boolean(),
  captureLimitId: z.string().min(1, "Capture limit ID is required"),
  addOns: AddOnsSchema.optional(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const UpdateEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
  name: z.string()
    .min(1, "Event name is required")
    .max(100, "Event name too long")
    .regex(/^[a-zA-Z0-9\s\-_.(),&!]+$/, "Event name contains invalid characters")
    .optional(),
  logo: z.string().optional(),
  eventType: EventTypeSchema.optional(),
  location: LocationSchema.optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  guestPackageId: z.string().min(1, "Guest package ID is required").optional(),
  reviewMode: z.boolean().optional(),
  captureLimitId: z.string().min(1, "Capture limit ID is required").optional(),
  addOns: AddOnsSchema.optional(),
  terms: z.boolean().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const DeleteEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const GetEventsByUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const GetEventByIdSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

// Capture Limit Schemas
export const CreateCaptureLimitSchema = z.object({
  plan: z.string().min(1, "Plan name is required").max(50, "Plan name too long"),
  planType: CapturePlanTypeSchema,
  photo: z.number().min(0, "Photo limit must be positive").optional(),
  video: z.number().min(0, "Video limit must be positive").optional(),
  pricePerGuest: z.number().min(0, "Price per guest must be positive"),
});

export const UpdateCaptureLimitSchema = CreateCaptureLimitSchema.partial().extend({
  captureLimitId: z.string().min(1, "Capture limit ID is required"),
});

// Gallery Schemas
export const CreateGalleryItemSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  guestId: z.string().min(1, "Guest ID is required"),
  fieldId: z.string().min(1, "File ID is required"),
});

export const DeleteGalleryItemSchema = z.object({
  galleryId: z.string().min(1, "Gallery ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const GetGalleryByEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

// Frontend Form Schemas (for react-hook-form)
export const EventFormSchema = z.object({
  name: z.string()
    .min(1, "Event name is required")
    .max(100, "Event name too long"),
  eventType: EventTypeSchema,
  location: LocationSchema,
  startDate: z.date({
    required_error: "Start date is required",
    invalid_type_error: "Invalid start date",
  }),
  endDate: z.date({
    required_error: "End date is required", 
    invalid_type_error: "Invalid end date",
  }),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  guestPackageId: z.string().min(1, "Please select a guest package"),
  reviewMode: z.boolean(),
  videoPackage: z.boolean(),
  captureLimitId: z.string().min(1, "Please select a capture plan"),
  addOns: AddOnsSchema,
  terms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine(data => {
  // If same date, end time must be after start time
  if (data.startDate.toDateString() === data.endDate.toDateString()) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time on the same day",
  path: ["endTime"],
});

export const GuestFormSchema = z.object({
  nickname: z.string()
    .min(1, "Nickname is required")
    .max(50, "Nickname too long")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Nickname can only contain letters, numbers, spaces, hyphens, underscores, and periods"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  socialHandle: z.string()
    .max(50, "Social handle too long")
    .regex(/^@?[a-zA-Z0-9._-]*$/, "Invalid social handle format")
    .optional()
    .or(z.literal("")),
});

// Type exports for TypeScript
export type EventType = z.infer<typeof EventTypeSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type GuestTier = z.infer<typeof GuestTierSchema>;
export type CapturePlanType = z.infer<typeof CapturePlanTypeSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Fingerprint = z.infer<typeof FingerprintSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type CreateGuest = z.infer<typeof CreateGuestSchema>;
export type UpdateGuest = z.infer<typeof UpdateGuestSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type EventForm = z.infer<typeof EventFormSchema>;
export type GuestForm = z.infer<typeof GuestFormSchema>;
export type CreateCaptureLimit = z.infer<typeof CreateCaptureLimitSchema>;
export type CreateGalleryItem = z.infer<typeof CreateGalleryItemSchema>; 