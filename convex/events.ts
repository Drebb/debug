import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import {
  calculateTotalDays,
  getCaptureTypePrice,
  getGuestTierPrice,
  getMaxGuestsFromTier,
  getPricePerGuestForPlan,
  type GuestTier,
  PRICING_CONSTANTS
} from "./pricing";

// Helper function to verify event ownership
async function verifyEventOwnership(ctx: { db: any }, eventId: string, userId: string) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this event");
  }
  return event;
}

// Create event (Create new event) - Now uses database-based pricing calculation
export const createEvent = mutation({
    args: {
      userId: v.id("users"),
      name: v.string(),
      logo: v.optional(v.string()),
      eventType: v.union(
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
      guestTier: v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      ),
      reviewMode: v.boolean(),
      captureLimitId: v.id("captureLimits"),
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
    },
    returns: v.id("events"),
    handler: async (ctx, args) => {
      // Get the capture limit to determine pricing
      const captureLimit = await ctx.db
        .query("captureLimits")
        .filter((q) => q.eq(q.field("_id"), args.captureLimitId))
        .unique();
      if (!captureLimit) {
        throw new Error(`Capture limit not found: ${args.captureLimitId}`);
      }

      // Calculate pricing directly
      const totalDays = calculateTotalDays(args.startDate, args.endDate);
      const basePackage = {
        dailyRate: PRICING_CONSTANTS.BASE_DAILY_RATE,
        totalDays,
        totalBasePrice: PRICING_CONSTANTS.BASE_DAILY_RATE * totalDays,
      };

      const maxGuests = getMaxGuestsFromTier(args.guestTier as GuestTier);
      const guestPackage = {
        tier: args.guestTier,
        maxGuests,
        additionalPrice: getGuestTierPrice(args.guestTier as GuestTier),
      };

      const videoEnabled = captureLimit.planType === "photos-videos" || captureLimit.planType === "videos-only";
      const videoPackage = {
        enabled: videoEnabled,
        price: getCaptureTypePrice(captureLimit.planType),
      };

      const pricePerGuest = getPricePerGuestForPlan(captureLimit.plan);
      const capturePackage = {
        planId: args.captureLimitId,
        plan: captureLimit.plan,
        planType: captureLimit.planType,
        photoLimit: captureLimit.photo || 0,
        videoLimit: captureLimit.video || 0,
        pricePerGuest,
        totalCapturePrice: pricePerGuest * maxGuests,
      };

      const totalPrice = 
        basePackage.totalBasePrice + 
        guestPackage.additionalPrice + 
        videoPackage.price + 
        capturePackage.totalCapturePrice;
      
      // Create event object with calculated pricing
      const eventData = {
        userId: args.userId,
        name: args.name,
        eventType: args.eventType,
        location: args.location,
        startDate: args.startDate,
        endDate: args.endDate,
        status: args.status,
        basePackage,
        guestPackage,
        reviewMode: args.reviewMode,
        videoPackage,
        captureLimitId: args.captureLimitId,
        addOns: args.addOns,
        terms: args.terms,
        price: totalPrice,
        updatedAt: Date.now(),
        paid: false,
      };
      
      return await ctx.db.insert("events", eventData);
    },
  });

export const getAllEvents = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(v.object({
    _id: v.id("events"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.string(),
    eventType: v.union(
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
      dailyRate: v.number(),
      totalDays: v.number(),
      totalBasePrice: v.number(),
    }),
    guestPackage: v.object({
      tier: v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      ),
      maxGuests: v.number(),
      additionalPrice: v.number(),
    }),
    reviewMode: v.boolean(),
    videoPackage: v.object({
      enabled: v.boolean(),
      price: v.number(),
    }),
    captureLimitId: v.id("captureLimits"),
    addOns: v.optional(v.object({
      filter: v.boolean(),
      brandedQR: v.boolean(),
    })),
    terms: v.boolean(),
    price: v.number(),
    updatedAt: v.number(),
    paid: v.boolean(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get event by ID (Open Specific Event) - Now requires userId for authorization
export const getEventById = query({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
    },
    returns: v.union(v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      eventType: v.union(
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
        dailyRate: v.number(),
        totalDays: v.number(),
        totalBasePrice: v.number(),
      }),
      guestPackage: v.object({
        tier: v.union(
          v.literal("0-100"),
          v.literal("100-200"),
          v.literal("200-300")
        ),
        maxGuests: v.number(),
        additionalPrice: v.number(),
      }),
      reviewMode: v.boolean(),
      videoPackage: v.object({
        enabled: v.boolean(),
        price: v.number(),
      }),
      captureLimitId: v.id("captureLimits"),
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      updatedAt: v.number(),
      paid: v.boolean(),
    }), v.null()),
    handler: async (ctx, args) => {
      const event = await ctx.db.get(args.eventId);
      if (!event) {
        return null;
      }
      
      // Verify ownership
      if (event.userId !== args.userId) {
        throw new Error("Unauthorized: You don't own this event");
      }
      
      return event;
    },
  });

// Update event (Edit Event) - Now uses database-based pricing calculation
export const updateEvent = mutation({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
      name: v.optional(v.string()),
      eventType: v.optional(v.union(
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
      )),
      location: v.optional(v.object({
        address: v.string(),
        city: v.string(),
        region: v.string(),
        postal: v.string(),
        country: v.string(),
      })),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      status: v.optional(v.union(
        v.literal("upcoming"),
        v.literal("live"), 
        v.literal("past")
      )),
      guestTier: v.optional(v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      )),
      reviewMode: v.optional(v.boolean()),
      captureLimitId: v.optional(v.id("captureLimits")),
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.optional(v.boolean()),
    },
    returns: v.id("events"),
    handler: async (ctx, args) => {
      const { eventId, userId, ...updates } = args;
      
      // Verify ownership before updating
      const existingEvent = await verifyEventOwnership(ctx, eventId, userId);
      
      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      // Check if pricing-related fields have changed
      const needsPricingRecalculation = 
        updates.startDate !== undefined || 
        updates.endDate !== undefined || 
        updates.guestTier !== undefined || 
        updates.captureLimitId !== undefined;
      
      if (needsPricingRecalculation) {
        // Get current or updated values for pricing calculation
        const startDate = updates.startDate !== undefined ? updates.startDate : existingEvent.startDate;
        const endDate = updates.endDate !== undefined ? updates.endDate : existingEvent.endDate;
        const guestTier = updates.guestTier !== undefined ? updates.guestTier : existingEvent.guestPackage.tier;
        const captureLimitId = updates.captureLimitId !== undefined ? updates.captureLimitId : existingEvent.captureLimitId;
        
        // Calculate new pricing directly
        const captureLimit = await ctx.db
          .query("captureLimits")
          .filter((q) => q.eq(q.field("_id"), captureLimitId))
          .unique();
        if (!captureLimit) {
          throw new Error(`Capture limit not found: ${captureLimitId}`);
        }

        const totalDays = calculateTotalDays(startDate, endDate);
        const basePackage = {
          dailyRate: PRICING_CONSTANTS.BASE_DAILY_RATE,
          totalDays,
          totalBasePrice: PRICING_CONSTANTS.BASE_DAILY_RATE * totalDays,
        };

        const maxGuests = getMaxGuestsFromTier(guestTier as GuestTier);
        const guestPackage = {
          tier: guestTier,
          maxGuests,
          additionalPrice: getGuestTierPrice(guestTier as GuestTier),
        };

        const videoEnabled = captureLimit.planType === "photos-videos" || captureLimit.planType === "videos-only";
        const videoPackage = {
          enabled: videoEnabled,
          price: getCaptureTypePrice(captureLimit.planType),
        };

        const pricePerGuest = getPricePerGuestForPlan(captureLimit.plan);
        const totalCapturePrice = pricePerGuest * maxGuests;

        const totalPrice = 
          basePackage.totalBasePrice + 
          guestPackage.additionalPrice + 
          videoPackage.price + 
          totalCapturePrice;
        
        // Update pricing-related fields
        (cleanUpdates as any).basePackage = basePackage;
        (cleanUpdates as any).guestPackage = guestPackage;
        (cleanUpdates as any).videoPackage = videoPackage;
        (cleanUpdates as any).price = totalPrice;
      }
      
      // Add updated timestamp
      (cleanUpdates as any).updatedAt = Date.now();
      
      await ctx.db.patch(eventId, cleanUpdates);
      
      return eventId;
    },
  });
  
// Delete event (Delete Event) - Now requires userId for authorization
export const deleteEvent = mutation({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
      // Verify ownership before deleting
      await verifyEventOwnership(ctx, args.eventId, args.userId);
      
      // First, get all guests for this event
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
      
      // Delete all gallery files for this event
      const galleryFiles = await ctx.db
        .query("gallery")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
      
      for (const file of galleryFiles) {
        // Delete the actual file from storage
        await ctx.storage.delete(file.fieldId);
        // Delete the gallery record
        await ctx.db.delete(file._id);
      }
      
      // Delete all guests for this event
      for (const guest of guests) {
        await ctx.db.delete(guest._id);
      }
      
      // Finally, delete the event
      await ctx.db.delete(args.eventId);
      return { success: true };
    },
  });
  
// Filter event by status (Filter event by Upcoming/Live/Past) - Now scoped to user
export const filterEventsByStatus = query({
    args: {
      userId: v.id("users"),
      status: v.union(
        v.literal("upcoming"),
        v.literal("live"), 
        v.literal("past")
      ),
    },
    returns: v.array(v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      eventType: v.union(
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
        dailyRate: v.number(),
        totalDays: v.number(),
        totalBasePrice: v.number(),
      }),
      guestPackage: v.object({
        tier: v.union(
          v.literal("0-100"),
          v.literal("100-200"),
          v.literal("200-300")
        ),
        maxGuests: v.number(),
        additionalPrice: v.number(),
      }),
      reviewMode: v.boolean(),
      videoPackage: v.object({
        enabled: v.boolean(),
        price: v.number(),
      }),
      captureLimitId: v.id("captureLimits"),
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      updatedAt: v.number(),
      paid: v.boolean(),
    })),
    handler: async (ctx, args) => {
      return await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
    },
  });
  
// Update event status based on current date - Now requires userId for authorization
export const updateEventStatus = mutation({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
    },
    returns: v.union(
      v.literal("upcoming"),
      v.literal("live"), 
      v.literal("past")
    ),
    handler: async (ctx, args) => {
      // Verify ownership before updating
      const event = await verifyEventOwnership(ctx, args.eventId, args.userId);
      
      const now = Date.now();
      let newStatus: "upcoming" | "live" | "past";
      
      if (now < event.startDate) {
        newStatus = "upcoming";
      } else if (now >= event.startDate && now <= event.endDate) {
        newStatus = "live";
      } else {
        newStatus = "past";
      }
      
      if (newStatus !== event.status) {
        await ctx.db.patch(args.eventId, {
          status: newStatus,
          updatedAt: now,
        });
      }
      
      return newStatus;
    },
  });