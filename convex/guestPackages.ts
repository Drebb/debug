import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all guest package tiers
 */
export const getGuestPackageTiers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("guestPackageTiers"),
      _creationTime: v.number(),
      tier: v.string(),
      maxGuests: v.number(),
      price: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("guestPackageTiers").collect();
  },
});