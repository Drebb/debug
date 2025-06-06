import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyEventOwnership, verifyGuestOwnership, validateWithZod } from "./utils";

// Import Zod schemas for validation
import { 
  CreateGuestSchema,
  UpdateGuestSchema,
  DeleteGuestSchema,
  CheckExistingRegistrationSchema,
  type CreateGuest,
  type UpdateGuest
} from "../src/lib/validations";

export const checkExistingRegistration = query({
  args: {
    eventId: v.id("events"),
    baseVisitorId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
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
    })
  ),
  handler: async (ctx, args) => {
    // Validate input data with Zod
    const dataToValidate = {
      eventId: args.eventId as string,
      baseVisitorId: args.baseVisitorId,
    };
    validateWithZod(CheckExistingRegistrationSchema, dataToValidate, "checkExistingRegistration");
    
    // Check if this device (base visitor ID) is already registered for this event
    // We need to check all guests for this event and see if any have a visitorId that starts with the base
    console.log("Checking existing registration for baseVisitorId:", args.baseVisitorId);
    
    const allGuestsForEvent = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    
    console.log("All guests for event:", allGuestsForEvent.map(g => ({ 
      id: g._id, 
      nickname: g.nickname, 
      visitorId: g.fingerprint.visitorId 
    })));
    
    const existingGuest = allGuestsForEvent.find(guest => 
      guest.fingerprint.visitorId.startsWith(args.baseVisitorId + "_")
    );
    
    console.log("Found existing guest:", existingGuest ? { 
      id: existingGuest._id, 
      nickname: existingGuest.nickname, 
      visitorId: existingGuest.fingerprint.visitorId 
    } : null);
    
    return existingGuest || null;
  },
});

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
      // Validate input data with Zod
      const dataToValidate = {
        eventId: args.eventId as string,
        nickname: args.nickname,
        email: args.email,
        socialHandle: args.socialHandle,
        fingerprint: args.fingerprint,
      };
      const validatedData = validateWithZod<CreateGuest>(CreateGuestSchema, dataToValidate, "saveGuestRecord");
      
      // Verify event exists (but don't check ownership)
      const event = await ctx.db.get(args.eventId);
      if (!event) {
        throw new Error("Event not found");
      }
      
      // Extract base visitor ID (before the nickname suffix)
      const baseVisitorId = validatedData.fingerprint.visitorId.split("_")[0];
      
      // Check if this device (base visitor ID) is already registered for this event
      const allGuestsForEvent = await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
      
      const existingGuest = allGuestsForEvent.find(guest => 
        guest.fingerprint.visitorId.startsWith(baseVisitorId + "_")
      );
      
      if (existingGuest) {
        throw new Error(`This device is already registered for this event with nickname: ${existingGuest.nickname}`);
      }
      
      const guestId = await ctx.db.insert("guests", {
        eventId: args.eventId,
        nickname: validatedData.nickname,
        email: validatedData.email,
        socialHandle: validatedData.socialHandle,
        fingerprint: validatedData.fingerprint,
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
      // Validate user and event IDs (basic validation since they're already Convex ID types)
      if (!args.eventId || !args.userId) {
        throw new Error("Event ID and User ID are required");
      }
      
      // Verify event exists and user owns it
      await verifyEventOwnership(ctx, args.eventId, args.userId);
      
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
      // Validate input data with Zod
      const dataToValidate = {
        guestId: args.guestId as string,
        userId: args.userId as string,
        nickname: args.nickname,
        email: args.email,
        socialHandle: args.socialHandle,
        fingerprint: args.fingerprint,
      };
      const validatedData = validateWithZod<UpdateGuest>(UpdateGuestSchema, dataToValidate, "updateGuestRecord");
      
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
      // Validate input data with Zod
      const dataToValidate = {
        guestId: args.guestId as string,
        userId: args.userId as string,
      };
      validateWithZod(DeleteGuestSchema, dataToValidate, "deleteGuestRecord");
      
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

// Get guest by fingerprint for authentication (used by guests to identify themselves)
export const getGuestByFingerprint = query({
  args: {
    eventId: v.id("events"),
    visitorId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
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
    })
  ),
  handler: async (ctx, args) => {
    // Find guest by exact visitor ID match
    const guest = await ctx.db
      .query("guests")
      .withIndex("by_event_and_fingerprint", (q) => 
        q.eq("eventId", args.eventId).eq("fingerprint.visitorId", args.visitorId)
      )
      .first();
    
    return guest || null;
  },
});



  