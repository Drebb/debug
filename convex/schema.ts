import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
 
  users: defineTable({
    email: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    clerkUser: v.any(),
  }).index("by_email", ["email"])
    .index("by_clerk_id", ["clerkUser.id"]),

  guests: defineTable({
    eventId: v.id("events"),
    nickname: v.string(),
    email: v.optional(v.string()),
    socialHandle: v.optional(v.string()),
    fingerprint: v.object({
      visitorId: v.string(),
      userAgent: v.string(),
    }),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"])
    .index("by_fingerprint", ["fingerprint.visitorId"])
    .index("by_event_and_fingerprint", ["eventId", "fingerprint.visitorId"]),

  guestPackageTiers: defineTable({
    tier: v.string(), // e.g., "0-100", "100-200", "200-300"
    maxGuests: v.number(), // Maximum number of guests for this tier
    price: v.number(), // Additional price on top of base package
  }),

    events: defineTable({
      userId: v.id("users"),
      name: v.string(),
      logo: v.optional(v.id("_storage")),
      coverImage: v.optional(v.id("_storage")),
      eventType:
        v.union(
          v.literal("Music Festival"),
          v.literal("Automotive Event"),
          v.literal("Wedding"),
          v.literal("Town Festival"),
          v.literal("Birthday"),
          v.literal("Graduation"),
          v.literal("Reunion"),
          v.literal("Conference"),
          v.literal("Tradeshow"),
          v.literal("Fundraiser"),
          v.literal("Sporting Event"),
          v.literal("Private Event"),
          v.literal("Concert")
        ),
      location: v.object({
        address: v.string(),
        city: v.string(),
        region: v.string(),
        postal: v.string(),
        country: v.string(),
      }),
      startDate: v.number(),
      endDate: v.number(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("live"), 
        v.literal("past")
      ),
      basePackage: v.object({
        dailyRate: v.number(),  //20$ every day
        totalDays: v.number(), //calculated from start/end dates
        totalBasePrice: v.number(), //dailyRate * totalDays
      }),
      guestPackageId: v.id("guestPackageTiers"), // Reference to the selected guest package tier
      reviewMode: v.boolean(),
      videoPackage: v.object({
        enabled: v.boolean(),
        price: v.number(), //0$ for false, 49$ for true
      }),
      captureLimitId: v.id("captureLimits"),
      addOns: v.optional(
        v.object({
          filter: v.boolean(),
          brandedQR: v.boolean(),
        })
      ),
      terms: v.boolean(),
      price: v.number(),
      updatedAt: v.number(),
      paid: v.boolean(),
    }).index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_start_date", ["startDate"])
      .index("by_guest_package", ["guestPackageId"]),

      captureLimits: defineTable({
        plan: v.string(),
        planType: v.union(v.literal("photos-only"), v.literal("photos-videos"), v.literal("videos-only")),
        photo: v.optional(v.number()),
        video: v.optional(v.number()),
        pricePerGuest: v.number(), // Price per guest for this capture plan
      }).index("by_plan", ["plan"]),
    
      gallery: defineTable({
        eventId: v.id("events"),
        guestId: v.id("guests"),
        fieldId: v.id("_storage"),
      })
    .index("by_event", ["eventId"])
    .index("by_guest", ["guestId"])
    .index("by_event_and_guest", ["eventId", "guestId"]),
});


