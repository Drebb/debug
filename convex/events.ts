import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Import Zod schemas for validation
import { 
  CreateEventSchema,
  UpdateEventSchema,
  DeleteEventSchema,
  GetEventsByUserSchema,
  GetEventByIdSchema,
  type CreateEvent,
  type UpdateEvent
} from "../src/lib/validations";

// Helper function to validate data with Zod
function validateWithZod<T>(schema: any, data: any, actionName: string): T {
  try {
    return schema.parse(data);
  } catch (error: any) {
    const errorMessage = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || error.message;
    throw new Error(`Validation failed for ${actionName}: ${errorMessage}`);
  }
}

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

// Create event (Create new event) - Simplified version
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
      guestPackageId: v.id("guestPackageTiers"),
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
      // Validate business logic and data types with Zod
      const dataToValidate = {
        userId: args.userId,
        name: args.name,
        logo: args.logo,
        eventType: args.eventType,
        location: args.location,
        startDate: args.startDate,
        endDate: args.endDate,
        status: args.status,
        guestPackageId: args.guestPackageId,
        reviewMode: args.reviewMode,
        captureLimitId: args.captureLimitId,
        addOns: args.addOns,
        terms: args.terms,
      };
      
      // Validate using Zod for business logic (dates, strings, etc.)
      validateWithZod(CreateEventSchema, dataToValidate, "createEvent");

      // Get the guest package tier
      const guestPackage = await ctx.db.get(args.guestPackageId) as any;
      if (!guestPackage) {
        throw new Error(`Guest package not found: ${args.guestPackageId}`);
      }

      // Get the capture limit to determine pricing
      const captureLimit = await ctx.db.get(args.captureLimitId) as any;
      if (!captureLimit) {
        throw new Error(`Capture limit not found: ${args.captureLimitId}`);
      }

      // Calculate pricing directly
      const timeDiff = args.endDate - args.startDate;
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      const basePackage = {
        dailyRate: 20, // Base daily rate
        totalDays,
        totalBasePrice: 20 * totalDays,
      };

      const videoEnabled = captureLimit.planType === "photos-videos" || captureLimit.planType === "videos-only";
      const videoPackage = {
        enabled: videoEnabled,
        price: videoEnabled ? 49 : 0,
      };

      const totalCapturePrice = captureLimit.pricePerGuest * guestPackage.maxGuests;

      const totalPrice = 
        basePackage.totalBasePrice + 
        guestPackage.price + 
        videoPackage.price + 
        totalCapturePrice;
      
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
        guestPackageId: args.guestPackageId,
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
    guestPackageId: v.id("guestPackageTiers"),
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
    // Validate input with Zod
    const dataToValidate = {
      userId: args.userId,
    };
    validateWithZod(GetEventsByUserSchema, dataToValidate, "getAllEvents");

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
      guestPackageId: v.id("guestPackageTiers"),
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
      // Validate input with Zod
      const dataToValidate = {
        eventId: args.eventId,
        userId: args.userId,
      };
      validateWithZod(GetEventByIdSchema, dataToValidate, "getEventById");

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

// Update event (Edit Event) - Simplified version
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
      guestPackageId: v.optional(v.id("guestPackageTiers")),
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
      // Validate input with Zod
      const dataToValidate = {
        eventId: args.eventId,
        userId: args.userId,
        name: args.name,
        eventType: args.eventType,
        location: args.location,
        startDate: args.startDate,
        endDate: args.endDate,
        status: args.status,
        guestPackageId: args.guestPackageId,
        reviewMode: args.reviewMode,
        captureLimitId: args.captureLimitId,
        addOns: args.addOns,
        terms: args.terms,
      };
      validateWithZod(UpdateEventSchema, dataToValidate, "updateEvent");

      const { eventId, userId, ...updates } = args;
      
      // Verify ownership before updating
      await verifyEventOwnership(ctx, eventId, userId);
      
      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
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
      // Validate input with Zod
      const dataToValidate = {
        eventId: args.eventId,
        userId: args.userId,
      };
      validateWithZod(DeleteEventSchema, dataToValidate, "deleteEvent");

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
      guestPackageId: v.id("guestPackageTiers"),
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