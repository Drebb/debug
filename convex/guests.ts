import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to verify event ownership via eventId
async function verifyEventOwnershipByEventId(ctx: any, eventId: string, userId: string) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this event");
  }
  return event;
}

// Helper function to verify guest ownership via guestId
async function verifyGuestOwnership(ctx: any, guestId: string, userId: string) {
  const guest = await ctx.db.get(guestId);
  if (!guest) {
    throw new Error("Guest not found");
  }
  
  const event = await ctx.db.get(guest.eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this guest");
  }
  
  return { guest, event };
}

export const saveGuestRecord = mutation({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
      nickname: v.string(),
      email: v.optional(v.string()),
      socialHandle: v.optional(v.string()),
      fingerprint: v.object({
        visitorId: v.string(),
        userAgent: v.string(),
      }),
    },
    returns: v.id("guests"),
    handler: async (ctx, args) => {
      // Verify ownership before adding guest
      await verifyEventOwnershipByEventId(ctx, args.eventId, args.userId);
      
      const guestId = await ctx.db.insert("guests", {
        eventId: args.eventId,
        nickname: args.nickname,
        email: args.email,
        socialHandle: args.socialHandle,
        fingerprint: args.fingerprint,
      });
      
      return guestId;
    },
  });
  
export const getGuestList = query({
    args: {
      eventId: v.id("events"),
      userId: v.id("users"),
    },
    returns: v.array(v.object({
      _id: v.id("guests"),
      _creationTime: v.number(),
      eventId: v.id("events"),
      nickname: v.string(),
      email: v.optional(v.string()),
      socialHandle: v.optional(v.string()),
      fingerprint: v.object({
        visitorId: v.string(),
        userAgent: v.string(),
      }),
    })),
    handler: async (ctx, args) => {
      // Verify ownership before showing guests
      await verifyEventOwnershipByEventId(ctx, args.eventId, args.userId);
      
      return await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
    },
  });
  
  export const updateGuestRecord = mutation({
    args: {
      guestId: v.id("guests"),
      userId: v.id("users"),
      nickname: v.optional(v.string()),
      email: v.optional(v.string()),
      socialHandle: v.optional(v.string()),
      fingerprint: v.optional(v.object({
        visitorId: v.string(),
        userAgent: v.string(),
      })),
    },
    returns: v.id("guests"),
    handler: async (ctx, args) => {
      const { guestId, userId, ...updates } = args;
      
      // Verify ownership before updating
      await verifyGuestOwnership(ctx, guestId, userId);
      
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      await ctx.db.patch(guestId, cleanUpdates);
      return guestId;
    },
  });

  // Delete guest record (Delete Guest) - Now requires userId for authorization
export const deleteGuestRecord = mutation({
    args: {
      guestId: v.id("guests"),
      userId: v.id("users"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
      // Verify ownership before deleting
      await verifyGuestOwnership(ctx, args.guestId, args.userId);
      
      // First, delete any gallery files associated with this guest
      const galleryFiles = await ctx.db
        .query("gallery")
        .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
        .collect();
      
      for (const file of galleryFiles) {
        // Delete the actual file from storage
        await ctx.storage.delete(file.fieldId);
        // Delete the gallery record
        await ctx.db.delete(file._id);
      }
      
      // Then delete the guest record
      await ctx.db.delete(args.guestId);
      return { success: true };
    },
  });
  