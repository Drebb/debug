import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
 
  users: defineTable({
    email: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    clerkUser: v.any(),
  }).index("by_clerk_id", ["clerkUser.id"])
});