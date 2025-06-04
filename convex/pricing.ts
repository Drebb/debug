import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Pricing constants
export const PRICING_CONSTANTS = {
  BASE_DAILY_RATE: 20,
  
  GUEST_TIERS: {
    "0-100": {
      maxGuests: 100,
      price: 80,
    },
    "100-200": {
      maxGuests: 200,
      price: 160,
    },
    "200-300": {
      maxGuests: 300,
      price: 240,
    },
  },
  
  CAPTURE_TYPES: {
    PHOTO_ONLY: 0,
    PHOTO_VIDEO: 49,
  },

  // Price per guest for different capture limit plans
  CAPTURE_PLAN_PRICING: {
    "Basic": 0,      // Basic plan is free
    "Standard": 1,   // $1 per guest
    "Unlimited": 3,  // $3 per guest
  },
} as const;

// Type definitions
export type GuestTier = keyof typeof PRICING_CONSTANTS.GUEST_TIERS;
export type CaptureType = "photos-only" | "photos-videos" | "videos-only";
export type CapturePlan = "Basic" | "Standard" | "Unlimited";

export interface PricingCalculation {
  basePackage: {
    dailyRate: number;
    totalDays: number;
    totalBasePrice: number;
  };
  guestPackage: {
    tier: GuestTier;
    maxGuests: number;
    additionalPrice: number;
  };
  videoPackage: {
    enabled: boolean;
    price: number;
  };
  capturePackage: {
    planId: Id<"captureLimits">;
    plan: string;
    planType: CaptureType;
    photoLimit: number;
    videoLimit: number;
    pricePerGuest: number;
    totalCapturePrice: number;
  };
  totalPrice: number;
}

// Helper function to calculate total days between start and end date
export function calculateTotalDays(startDate: number, endDate: number): number {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // Minimum 1 day
}

// Helper function to get max guests based on tier
export function getMaxGuestsFromTier(tier: GuestTier): number {
  return PRICING_CONSTANTS.GUEST_TIERS[tier].maxGuests;
}

// Helper function to get guest tier price
export function getGuestTierPrice(tier: GuestTier): number {
  return PRICING_CONSTANTS.GUEST_TIERS[tier].price;
}

// Helper function to get capture type price based on plan type
export function getCaptureTypePrice(planType: CaptureType): number {
  switch (planType) {
    case "photos-only":
      return PRICING_CONSTANTS.CAPTURE_TYPES.PHOTO_ONLY;
    case "photos-videos":
      return PRICING_CONSTANTS.CAPTURE_TYPES.PHOTO_VIDEO;
    case "videos-only":
      return PRICING_CONSTANTS.CAPTURE_TYPES.PHOTO_VIDEO; // Videos require the video package
    default:
      return PRICING_CONSTANTS.CAPTURE_TYPES.PHOTO_ONLY;
  }
}

// Helper function to get price per guest for a capture plan
export function getPricePerGuestForPlan(plan: string): number {
  return PRICING_CONSTANTS.CAPTURE_PLAN_PRICING[plan as keyof typeof PRICING_CONSTANTS.CAPTURE_PLAN_PRICING] || 0;
}

// Query to calculate pricing for frontend display
export const calculatePricing = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    guestTier: v.union(
      v.literal("0-100"),
      v.literal("100-200"),
      v.literal("200-300")
    ),
    captureLimitId: v.id("captureLimits"),
  },
  returns: v.object({
    basePackage: v.object({
      dailyRate: v.number(),
      totalDays: v.number(),
      totalBasePrice: v.number(),
    }),
    guestPackage: v.object({
      tier: v.union(
        v.literal("0-100"),
        v.literal("100-200"),
        v.literal("200-300")
      ),
      maxGuests: v.number(),
      additionalPrice: v.number(),
    }),
    videoPackage: v.object({
      enabled: v.boolean(),
      price: v.number(),
    }),
    capturePackage: v.object({
      planId: v.id("captureLimits"),
      plan: v.string(),
      planType: v.union(v.literal("photos-only"), v.literal("photos-videos"), v.literal("videos-only")),
      photoLimit: v.number(),
      videoLimit: v.number(),
      pricePerGuest: v.number(),
      totalCapturePrice: v.number(),
    }),
    totalPrice: v.number(),
    breakdown: v.object({
      basePackage: v.object({
        description: v.string(),
        price: v.number(),
      }),
      guestPackage: v.object({
        description: v.string(),
        price: v.number(),
      }),
      videoPackage: v.object({
        description: v.string(),
        price: v.number(),
      }),
      capturePackage: v.object({
        description: v.string(),
        price: v.number(),
      }),
      total: v.object({
        description: v.string(),
        price: v.number(),
      }),
    }),
  }),
  handler: async (ctx, args) => {
    // Get the capture limit record from database
    const captureLimit = await ctx.db.get(args.captureLimitId);
    if (!captureLimit) {
      throw new Error(`Capture limit not found: ${args.captureLimitId}`);
    }

    // Calculate base package
    const totalDays = calculateTotalDays(args.startDate, args.endDate);
    const basePackage = {
      dailyRate: PRICING_CONSTANTS.BASE_DAILY_RATE,
      totalDays,
      totalBasePrice: PRICING_CONSTANTS.BASE_DAILY_RATE * totalDays,
    };

    // Calculate guest package
    const maxGuests = getMaxGuestsFromTier(args.guestTier as GuestTier);
    const guestPackage = {
      tier: args.guestTier,
      maxGuests,
      additionalPrice: getGuestTierPrice(args.guestTier as GuestTier),
    };

    // Calculate video package based on plan type
    const videoEnabled = captureLimit.planType === "photos-videos" || captureLimit.planType === "videos-only";
    const videoPackage = {
      enabled: videoEnabled,
      price: getCaptureTypePrice(captureLimit.planType),
    };

    // Calculate capture package
    const pricePerGuest = getPricePerGuestForPlan(captureLimit.plan);
    const capturePackage = {
      planId: args.captureLimitId,
      plan: captureLimit.plan,
      planType: captureLimit.planType,
      photoLimit: captureLimit.photo || 0,
      videoLimit: captureLimit.video || 0,
      pricePerGuest,
      totalCapturePrice: pricePerGuest * maxGuests,
    };

    // Calculate total price
    const totalPrice = 
      basePackage.totalBasePrice + 
      guestPackage.additionalPrice + 
      videoPackage.price + 
      capturePackage.totalCapturePrice;

    const calculation = {
      basePackage,
      guestPackage,
      videoPackage,
      capturePackage,
      totalPrice,
    };
    
    const breakdown = getPricingBreakdown(calculation);
    
    return {
      ...calculation,
      breakdown,
    };
  },
});

// Function to get pricing breakdown for display
export function getPricingBreakdown(calculation: PricingCalculation) {
  const photoText = calculation.capturePackage.photoLimit === -1 ? "Unlimited" : calculation.capturePackage.photoLimit.toString();
  const videoText = calculation.capturePackage.videoLimit === -1 ? "Unlimited" : calculation.capturePackage.videoLimit.toString();
  
  let captureDescription = "";
  if (calculation.capturePackage.planType === "photos-only") {
    captureDescription = `${calculation.capturePackage.plan} Plan - ${photoText} photos`;
  } else if (calculation.capturePackage.planType === "videos-only") {
    captureDescription = `${calculation.capturePackage.plan} Plan - ${videoText} videos`;
  } else {
    captureDescription = `${calculation.capturePackage.plan} Plan - ${photoText} photos, ${videoText} videos`;
  }

  if (calculation.capturePackage.pricePerGuest > 0) {
    captureDescription += ` ($${calculation.capturePackage.pricePerGuest} × ${calculation.guestPackage.maxGuests} guests)`;
  } else {
    captureDescription += " (included)";
  }

  return {
    basePackage: {
      description: `Base Package (${calculation.basePackage.totalDays} ${calculation.basePackage.totalDays === 1 ? 'day' : 'days'} × $${calculation.basePackage.dailyRate})`,
      price: calculation.basePackage.totalBasePrice,
    },
    guestPackage: {
      description: `Guest Tier ${calculation.guestPackage.tier} (up to ${calculation.guestPackage.maxGuests} guests)`,
      price: calculation.guestPackage.additionalPrice,
    },
    videoPackage: {
      description: calculation.capturePackage.planType === "photos-only" ? "Photo Only Capture" : 
                   calculation.capturePackage.planType === "videos-only" ? "Video Only Capture" : 
                   "Photo + Video Capture",
      price: calculation.videoPackage.price,
    },
    capturePackage: {
      description: captureDescription,
      price: calculation.capturePackage.totalCapturePrice,
    },
    total: {
      description: "Total Price",
      price: calculation.totalPrice,
    },
  };
}

// Query to get available capture plans based on plan type
export const getCapturePlans = query({
  args: {
    planType: v.optional(v.union(v.literal("photos-only"), v.literal("photos-videos"), v.literal("videos-only"))),
  },
  returns: v.array(v.object({
    _id: v.id("captureLimits"),
    plan: v.string(),
    planType: v.union(v.literal("photos-only"), v.literal("photos-videos"), v.literal("videos-only")),
    photo: v.optional(v.number()),
    video: v.optional(v.number()),
    pricePerGuest: v.number(),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("captureLimits");
    
    if (args.planType) {
      query = query.filter((q) => q.eq(q.field("planType"), args.planType));
    }
    
    const captureLimits = await query.collect();
    
    return captureLimits.map(limit => ({
      _id: limit._id,
      plan: limit.plan,
      planType: limit.planType,
      photo: limit.photo,
      video: limit.video,
      pricePerGuest: getPricePerGuestForPlan(limit.plan),
    }));
  },
});

// Query to get all capture plan types available
export const getCapturePlanTypes = query({
  args: {},
  returns: v.array(v.union(v.literal("photos-only"), v.literal("photos-videos"), v.literal("videos-only"))),
  handler: async (ctx) => {
    const captureLimits = await ctx.db.query("captureLimits").collect();
    const planTypes = [...new Set(captureLimits.map(limit => limit.planType))];
    return planTypes as CaptureType[];
  },
});

// Helper function to validate guest tier
export function isValidGuestTier(tier: string): tier is GuestTier {
  return tier in PRICING_CONSTANTS.GUEST_TIERS;
}
