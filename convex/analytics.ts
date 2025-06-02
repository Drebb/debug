import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllEventCount = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const events = await ctx.db.query("events").collect();
        return events.length;
    },
});

export const getAllGuestCountWhole = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const guests = await ctx.db.query("guests").collect();
        return guests.length;
    },
});

export const getAllGuestCountPerEvent = query({
    args: {
        eventId: v.id("events"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        const guests = await ctx.db.query("guests").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
        return guests.length;
    },
});

export const getAllTotalUploadWhole = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const gallery = await ctx.db.query("gallery").collect();
        return gallery.length;
    },
});

export const getAllTotalUploadPerEvent = query({
    args: {
        eventId: v.id("events"),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        const gallery = await ctx.db.query("gallery").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
        return gallery.length;
    },
});