import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveGuestRecord = mutation({
    args: {
      eventId: v.id("events"),
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
      if (args.eventId) {
        return await ctx.db
          .query("guests")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
          .collect();
      } else {
        return await ctx.db.query("guests").collect();
      }
    },
  });
  
  export const updateGuestRecord = mutation({
    args: {
      guestId: v.id("guests"),
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
      const { guestId, ...updates } = args;
      
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      await ctx.db.patch(guestId, cleanUpdates);
      return guestId;
    },
  });

  // Delete guest record (Delete Guest)
export const deleteGuestRecord = mutation({
    args: {
      guestId: v.id("guests"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
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
  