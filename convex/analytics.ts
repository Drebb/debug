import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to verify event ownership
async function verifyEventOwnership(ctx: any, eventId: string, userId: string) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this event");
  }
  return event;
}

// Get total event count for a specific user (scoped to user)
export const getAllEventCount = query({
    args: {
        userId: v.id("users"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        const events = await ctx.db
            .query("events")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        return events.length;
    },
});

// Get total guest count for all events owned by user (scoped to user)
export const getAllGuestCountWhole = query({
    args: {
        userId: v.id("users"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Get all events for this user
        const userEvents = await ctx.db
            .query("events")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        
        const eventIds = userEvents.map(event => event._id);
        
        // Count guests for all user's events
        let totalGuests = 0;
        for (const eventId of eventIds) {
            const guests = await ctx.db
                .query("guests")
                .withIndex("by_event", (q) => q.eq("eventId", eventId))
                .collect();
            totalGuests += guests.length;
        }
        
        return totalGuests;
    },
});

// Get guest count for a specific event (requires ownership verification)
export const getAllGuestCountPerEvent = query({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Verify ownership before showing analytics
        await verifyEventOwnership(ctx, args.eventId, args.userId);
        
        const guests = await ctx.db
            .query("guests")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();
        return guests.length;
    },
});

// Get total upload count for all events owned by user (scoped to user)
export const getAllTotalUploadWhole = query({
    args: {
        userId: v.id("users"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Get all events for this user
        const userEvents = await ctx.db
            .query("events")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        
        const eventIds = userEvents.map(event => event._id);
        
        // Count uploads for all user's events
        let totalUploads = 0;
        for (const eventId of eventIds) {
            const uploads = await ctx.db
                .query("gallery")
                .withIndex("by_event", (q) => q.eq("eventId", eventId))
                .collect();
            totalUploads += uploads.length;
        }
        
        return totalUploads;
    },
});

// Get upload count for a specific event (requires ownership verification)
export const getAllTotalUploadPerEvent = query({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Verify ownership before showing analytics
        await verifyEventOwnership(ctx, args.eventId, args.userId);
        
        const gallery = await ctx.db
            .query("gallery")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();
        return gallery.length;
    },
});