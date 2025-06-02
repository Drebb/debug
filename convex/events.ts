import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create event (Create new event)
export const createEvent = mutation({
    args: {
      name: v.string(),
      eventType: v.array(v.union(
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
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      qrHash: v.string(),
      qrRoute: v.string(),
    },
    returns: v.id("events"),
    handler: async (ctx, args) => {
      const eventId = await ctx.db.insert("events", {
        ...args,
        updatedAt: Date.now()
      });
      return eventId;
    },
  });

  export const getAllEvents = query({
    args: {},
    returns: v.array(v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      name: v.string(),
      eventType: v.array(v.union(
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
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      qrHash: v.string(),
      qrRoute: v.string(),
      updatedAt: v.number(),
    })),
    handler: async (ctx) => {
      return await ctx.db.query("events").collect();
    },
  });
  

  // Get event by ID (Open Specific Event)
export const getEventById = query({
    args: {
      eventId: v.id("events"),
    },
    returns: v.union(v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      name: v.string(),
      eventType: v.array(v.union(
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
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      qrHash: v.string(),
      qrRoute: v.string(),
      updatedAt: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
      return await ctx.db.get(args.eventId);
    },
  });

  // Update event (Edit Event)
export const updateEvent = mutation({
    args: {
      eventId: v.id("events"),
      name: v.optional(v.string()),
      eventType: v.optional(v.array(v.union(
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
      ))),
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
      estimatedGuest: v.optional(v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      )),
      guestLimit: v.optional(v.number()),
      reviewMode: v.optional(v.boolean()),
      withVideo: v.optional(v.boolean()),
      captureType: v.optional(v.boolean()),
      captureLimitId: v.optional(v.id("captureLimits")),
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.optional(v.boolean()),
      price: v.optional(v.number()),
      qrHash: v.optional(v.string()),
      qrRoute: v.optional(v.string()),
    },
    returns: v.id("events"),
    handler: async (ctx, args) => {
      const { eventId, ...updates } = args;
      
      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      // Add updated timestamp
      cleanUpdates.updatedAt = Date.now();
      
      await ctx.db.patch(eventId, cleanUpdates);
      return eventId;
    },
  });
  
  // Delete event (Delete Event)
export const deleteEvent = mutation({
    args: {
      eventId: v.id("events"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
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
  
// Filter event by status (Filter event by Upcoming/Live/Past)
export const filterEventsByStatus = query({
    args: {
      status: v.union(
        v.literal("upcoming"),
        v.literal("live"), 
        v.literal("past")
      ),
    },
    returns: v.array(v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      name: v.string(),
      eventType: v.array(v.union(
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
      addOns: v.optional(v.object({
        filter: v.boolean(),
        brandedQR: v.boolean(),
      })),
      terms: v.boolean(),
      price: v.number(),
      qrHash: v.string(),
      qrRoute: v.string(),
      updatedAt: v.number(),
    })),
    handler: async (ctx, args) => {
      return await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect();
    },
  });
  
  // Update event status based on current date
export const updateEventStatus = mutation({
    args: {
      eventId: v.id("events"),
    },
    returns: v.union(
      v.literal("upcoming"),
      v.literal("live"), 
      v.literal("past")
    ),
    handler: async (ctx, args) => {
      const event = await ctx.db.get(args.eventId);
      if (!event) throw new Error("Event not found");
      
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