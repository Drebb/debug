import {
    internalMutation,
    internalQuery,
    mutation,
    query,
    QueryCtx,
  } from "./_generated/server";
  
  import { v } from "convex/values";
  import { Doc, Id } from "./_generated/dataModel";
  import { UserJSON } from "@clerk/backend";
  import { validateWithZod } from "./utils";

// Import Zod schemas for validation
import { 
  CreateUserSchema,
  type CreateUser
} from "../src/lib/validations";

  interface UserData {
    email: string;
    first_name: string;
    last_name: string;
    clerkUser: UserJSON;
  }

  /**
   * Whether the current user is fully logged in, including having their information
   * synced from Clerk via webhook.
   *
   * Like all Convex queries, errors on expired Clerk token.
   */
  export const userLoginStatus = query({
    args: {},
    returns: v.object({
      status: v.union(
        v.literal("No JWT Token"),
        v.literal("No Clerk User"),
        v.literal("Logged In")
      ),
      user: v.union(
        v.null(),
        v.object({
          _id: v.id("users"),
          _creationTime: v.number(),
          email: v.string(),
          first_name: v.optional(v.string()),
          last_name: v.optional(v.string()),
          clerkUser: v.any(),
        })
      ),
    }),
    handler: async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        // no JWT token, user hasn't completed login flow yet
        return { status: "No JWT Token" as const, user: null };
      }
      const user = await getCurrentUser(ctx);
      if (user === null) {
        // If Clerk has not told us about this user we're still waiting for the
        // webhook notification.
        return { status: "No Clerk User" as const, user: null };
      }
      return { status: "Logged In" as const, user };
    }
  });
  
  /** The current user, containing user preferences and Clerk user info. */
  export const currentUser = query({
    args: {},
    returns: v.union(
      v.null(),
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        email: v.string(),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        clerkUser: v.any(),
      })
    ),
    handler: async (ctx) => getCurrentUser(ctx),
  });
  
  /** Get user by Clerk use id (AKA "subject" on auth)  */
  export const getUser = internalQuery({
    args: { subject: v.string() },
    returns: v.union(
      v.null(),
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        email: v.string(),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        clerkUser: v.any(),
      })
    ),
    async handler(ctx, args) {
      return await userQuery(ctx, args.subject);
    },
  });
  
  /** Create a new Clerk user or update existing Clerk user data. */
  export const updateOrCreateUser = internalMutation({
    args: { clerkUser: v.any() }, // no runtime validation, trust Clerk
    returns: v.null(),
    async handler(ctx, { clerkUser }: { clerkUser: UserJSON }) {
      const userRecord = await userQuery(ctx, clerkUser.id);

      const userData: UserData = {
        email: clerkUser.email_addresses[0]?.email_address || "",
        first_name: clerkUser.first_name || "",
        last_name: clerkUser.last_name || "",
        clerkUser,
      };

      // Validate user data with Zod before inserting/updating
      const validatedData = validateWithZod<CreateUser>(CreateUserSchema, {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        clerkUser: userData.clerkUser,
      }, "updateOrCreateUser");
  
      if (userRecord === null) {
        await ctx.db.insert("users", userData);
      } else {
        await ctx.db.patch(userRecord._id, userData);
      }
    },
  });   
  
  /** Delete a user by clerk user ID. */
  export const deleteUser = internalMutation({
    args: { id: v.string() },
    returns: v.null(),
    async handler(ctx, { id }) {
      // Basic validation
      if (!id || id.trim().length === 0) {
        throw new Error("User ID is required and cannot be empty");
      }
      
      const userRecord = await userQuery(ctx, id);
  
      if (userRecord === null) {
        console.warn("can't delete user, does not exist", id);
      } else {
        // Check if user has any events before deleting
        const userEvents = await ctx.db
          .query("events")
          .withIndex("by_user", (q) => q.eq("userId", userRecord._id))
          .collect();
        
        if (userEvents.length > 0) {
          throw new Error("Cannot delete user with existing events. Please delete all events first.");
        }
        
        await ctx.db.delete(userRecord._id);
      }
    },
  });

  // Helpers
  
  export async function userQuery(
    ctx: QueryCtx,
    clerkUserId: string
  ): Promise<Doc<"users"> | null> {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUser.id", clerkUserId))
      .unique();
  }
  
  export async function userById(
    ctx: QueryCtx,
    id: Id<"users">
  ): Promise<Doc<"users"> | null> {
    return await ctx.db.get(id);
  }
  
  async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return await userQuery(ctx, identity.subject);
  }
  
  export async function mustGetCurrentUser(ctx: QueryCtx): Promise<Doc<"users">> {
    const userRecord = await getCurrentUser(ctx);
    if (!userRecord) throw new Error("Can't get current user");
    return userRecord;
  }