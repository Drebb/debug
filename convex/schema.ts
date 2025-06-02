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
    .index("by_email", ["email"]),

    events: defineTable({
      name: v.string(),
      eventType: v.array(
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
        )
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
      estimatedGuest: v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      ),
      guestLimit: v.number(),
      reviewMode: v.boolean(),
      withVideo: v.boolean(),
      captureType: v.boolean(),
      captureLimitId: v.id("captureLimits"),
      addOns: v.optional(
        v.object({
          filter: v.boolean(),
          brandedQR: v.boolean(),
        })
      ),
      terms: v.boolean(),
      price: v.number(),
      qrHash: v.string(),
      qrRoute: v.string(),
      updatedAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_start_date", ["startDate"])
      .index("by_qr_hash", ["qrHash"]),

      captureLimits: defineTable({
        plan: v.string(),
        planType: v.union(v.literal("photos-only"), v.literal("photos-videos")),
        photo: v.number(),
        video: v.number(),
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


