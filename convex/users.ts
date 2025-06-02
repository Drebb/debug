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
  export const userLoginStatus = query(
    async (
      ctx
    ): Promise<
      | ["No JWT Token", null]
      | ["No Clerk User", null]
      | ["Logged In", Doc<"users">]
> => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        // no JWT token, user hasn't completed login flow yet
        return ["No JWT Token", null];
      }
      const user = await getCurrentUser(ctx);
      if (user === null) {
        // If Clerk has not told us about this user we're still waiting for the
        // webhook notification.
        return ["No Clerk User", null];
      }
      return ["Logged In", user];
    }
  );
  
  /** The current user, containing user preferences and Clerk user info. */
  export const currentUser = query((ctx: QueryCtx) => getCurrentUser(ctx));
  
  /** Get user by Clerk use id (AKA "subject" on auth)  */
  export const getUser = internalQuery({
    args: { subject: v.string() },
    async handler(ctx, args) {
      return await userQuery(ctx, args.subject);
    },
  });
  
  /** Create a new Clerk user or update existing Clerk user data. */
  export const updateOrCreateUser = internalMutation({
    args: { clerkUser: v.any() }, // no runtime validation, trust Clerk
    async handler(ctx, { clerkUser }: { clerkUser: UserJSON }) {
      const userRecord = await userQuery(ctx, clerkUser.id);

      const userData: UserData = {
        email: clerkUser.email_addresses[0]?.email_address || "",
        first_name: clerkUser.first_name || "",
        last_name: clerkUser.last_name || "",
        clerkUser,
      };
  
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
    async handler(ctx, { id }) {
      const userRecord = await userQuery(ctx, id);
  
      if (userRecord === null) {
        console.warn("can't delete user, does not exist", id);
      } else {
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