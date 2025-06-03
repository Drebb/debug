import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCaptureLimits = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("captureLimits"),
    _creationTime: v.number(),
    plan: v.string(),
    planType: v.union(v.literal("photos-only"), v.literal("photos-videos")),
    photo: v.optional(v.number()),
    video: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("captureLimits").collect();
  },
});