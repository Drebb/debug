import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { 
  verifyEventOwnership, 
  verifyGalleryOwnership, 
  validateWithZod,
  generateGalleryFilename,
  getFileMetadataWithUrl
} from "./utils";

// Import Zod schemas for validation
import { 
  CreateGalleryItemSchema,
  DeleteGalleryItemSchema,
  GetGalleryByEventSchema,
  type CreateGalleryItem
} from "../src/lib/validations";

export const generateUploadURL = mutation({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Guest upload function (no user ownership required)
export const uploadToGalleryByGuest = mutation({
    args: {
        fileId: v.id("_storage"),
        eventId: v.id("events"),
        guestId: v.id("guests"),
    },
    returns: v.id("gallery"),
    handler: async (ctx, args) => {
        // Validate input data with Zod
        const dataToValidate = {
            eventId: args.eventId as string,
            guestId: args.guestId as string,
            fieldId: args.fileId as string,
        };
        const validatedData = validateWithZod<CreateGalleryItem>(CreateGalleryItemSchema, dataToValidate, "uploadToGalleryByGuest");
        
        // Verify guest exists and belongs to this event
        const guest = await ctx.db.get(args.guestId);
        if (!guest || guest.eventId !== args.eventId) {
            throw new Error("Guest not found or doesn't belong to this event");
        }
        
        // Verify event exists
        const event = await ctx.db.get(args.eventId);
        if (!event) {
            throw new Error("Event not found");
        }
        
        return await ctx.db.insert("gallery", {
            fieldId: args.fileId,
            eventId: args.eventId,
            guestId: args.guestId,
        });
    },
});

export const deleteFromGallery = mutation({
    args: {
        galleryId: v.id("gallery"),
        userId: v.id("users"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Validate input data with Zod
        const dataToValidate = {
            galleryId: args.galleryId as string,
            userId: args.userId as string,
        };
        validateWithZod(DeleteGalleryItemSchema, dataToValidate, "deleteFromGallery");
        
        // Verify ownership before deletion
        const { galleryRecord } = await verifyGalleryOwnership(ctx, args.galleryId, args.userId);

        // Delete the file from storage
        await ctx.storage.delete(galleryRecord.fieldId);
        
        // Delete the gallery record
        await ctx.db.delete(args.galleryId);
        
        return null;
    },
});

// Delete all images from an event gallery
export const deleteAllImagesFromEvent = mutation({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"),
    },
    returns: v.object({
        success: v.boolean(),
        deletedCount: v.number(),
    }),
    handler: async (ctx, args) => {
        // Validate input data with Zod
        const dataToValidate = {
            eventId: args.eventId as string,
            userId: args.userId as string,
        };
        validateWithZod(GetGalleryByEventSchema, dataToValidate, "deleteAllImagesFromEvent");
        
        // Verify ownership before deletion
        await verifyEventOwnership(ctx, args.eventId, args.userId);
        
        // Get all gallery items for this event
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();
        
        let deletedCount = 0;
        
        // Delete all gallery files for this event
        for (const item of galleryItems) {
            try {
                // Delete the actual file from storage
                await ctx.storage.delete(item.fieldId);
                // Delete the gallery record
                await ctx.db.delete(item._id);
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete gallery item ${item._id}:`, error);
                // Continue with other items even if one fails
            }
        }
        
        return {
            success: true,
            deletedCount,
        };
    },
});

// Get file URL for display
export const getFileUrl = query({
    args: {
        fileId: v.id("_storage"),
        userId: v.id("users"),
    },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        // Find gallery record that contains this file
        const galleryRecord = await ctx.db
            .query("gallery")
            .filter((q) => q.eq(q.field("fieldId"), args.fileId))
            .first();
            
        if (!galleryRecord) {
            return null;
        }
        
        // Verify ownership
        await verifyEventOwnership(ctx, galleryRecord.eventId, args.userId);
        
        return await ctx.storage.getUrl(args.fileId);
    },
});

//Get Gallery by event by organizer/user
export const getGalleryByEvent = query({
    args: {
        userId: v.id("users"),
        eventId: v.id("events"),
    },
    returns: v.array(v.object({
        _id: v.id("gallery"),
        _creationTime: v.number(),
        eventId: v.id("events"),
        guestId: v.id("guests"),
        fieldId: v.id("_storage"),
    })),
    handler: async (ctx, args) => {
        // Validate input data with Zod
        const dataToValidate = {
            eventId: args.eventId as string,
            userId: args.userId as string,
        };
        validateWithZod(GetGalleryByEventSchema, dataToValidate, "getGalleryByEvent");
        
        // Verify ownership before showing gallery
        await verifyEventOwnership(ctx, args.eventId, args.userId);
        
        return await ctx.db.query("gallery").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
    },
});

export const getGalleryByGuest = query({
    args: {
        guestId: v.id("guests"),
        userId: v.id("users"),
    },
    returns: v.array(v.object({
        galleryId: v.id("gallery"),
        url: v.string(),
        filename: v.string(),
        contentType: v.optional(v.string()),
        size: v.number(),
        guestNickname: v.string(),
        uploadTime: v.number(),
    })),
    handler: async (ctx, args) => {
        // Get the guest and verify ownership of the event
        const guest = await ctx.db.get(args.guestId);
        if (!guest) {
            throw new Error("Guest not found");
        }
        
        // Verify ownership of the event
        await verifyEventOwnership(ctx, guest.eventId, args.userId);

        // Get all gallery items for the guest
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
            .collect();

        const results = [];

        for (const item of galleryItems) {
            // Use shared utility to get file metadata with URL
            const fileData = await getFileMetadataWithUrl(ctx, item.fieldId);
            if (!fileData) continue;

            // Get event info for filename
            const event = await ctx.db.get(item.eventId);
            if (!event) continue;

            // Type assertion to ensure guest has the correct type
            const guestRecord = guest as { _id: any; nickname: string; [key: string]: any };

            // Generate filename using shared utility
            const filename = generateGalleryFilename(event.name, guestRecord.nickname, item._creationTime, fileData.contentType);

            results.push({
                galleryId: item._id,
                url: fileData.url,
                filename,
                contentType: fileData.contentType,
                size: fileData.size,
                guestNickname: guestRecord.nickname,
                uploadTime: item._creationTime,
            });
        }

        // Sort by upload time (newest first)
        return results.sort((a, b) => b.uploadTime - a.uploadTime);
    },
});

// Get image download URL with metadata
export const getImageForDownload = query({
    args: {
        galleryId: v.id("gallery"),
        userId: v.id("users"),
    },
    returns: v.union(v.object({
        url: v.string(),
        filename: v.string(),
        contentType: v.optional(v.string()),
        size: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        // Verify ownership before providing download
        const { galleryRecord } = await verifyGalleryOwnership(ctx, args.galleryId, args.userId);

        // Get file metadata from storage system table
        const fileMetadata = await ctx.db.system.get(galleryRecord.fieldId) as {
            _id: any;
            _creationTime: number;
            contentType?: string;
            sha256: string;
            size: number;
        } | null;
        
        if (!fileMetadata) {
            return null;
        }

        // Get download URL
        const url = await ctx.storage.getUrl(galleryRecord.fieldId);
        if (!url) {
            return null;
        }

        // Generate filename based on creation time and file extension
        const fileExtension = fileMetadata.contentType?.includes('image/jpeg') ? '.jpg' : 
                             fileMetadata.contentType?.includes('image/png') ? '.png' :
                             fileMetadata.contentType?.includes('image/webp') ? '.webp' :
                             fileMetadata.contentType?.includes('video/mp4') ? '.mp4' :
                             '';
        
        const date = new Date(galleryRecord._creationTime);
        const filename = `gallery_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}${fileExtension}`;

        return {
            url,
            filename,
            contentType: fileMetadata.contentType,
            size: fileMetadata.size,
        };
    },
});

// Get all images from an event for bulk download
export const getAllImagesForDownload = query({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"),
    },
    returns: v.array(v.object({
        galleryId: v.id("gallery"),
        url: v.string(),
        filename: v.string(),
        contentType: v.optional(v.string()),
        size: v.number(),
        guestNickname: v.string(),
        uploadTime: v.number(),
    })),
    handler: async (ctx, args) => {
        // Verify ownership before bulk download
        const event = await verifyEventOwnership(ctx, args.eventId, args.userId);

        // Get all gallery items for the event
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();

        const results = [];

        for (const item of galleryItems) {
            // Use shared utility to get file metadata with URL
            const fileData = await getFileMetadataWithUrl(ctx, item.fieldId);
            if (!fileData) continue;

            // Get guest info
            const guest = await ctx.db.get(item.guestId);
            if (!guest) continue;

            // Type assertion to ensure guest has the correct type
            const guestRecord = guest as { _id: any; nickname: string; [key: string]: any };

            // Generate filename using shared utility
            const filename = generateGalleryFilename(event.name, guestRecord.nickname, item._creationTime, fileData.contentType);

            results.push({
                galleryId: item._id,
                url: fileData.url,
                filename,
                contentType: fileData.contentType,
                size: fileData.size,
                guestNickname: guestRecord.nickname,
                uploadTime: item._creationTime,
            });
        }

        // Sort by upload time (newest first)
        return results.sort((a, b) => b.uploadTime - a.uploadTime);
    },
});

// Get shareable link for a gallery image
export const getShareableImageUrl = query({
    args: {
        galleryId: v.id("gallery"),
        userId: v.id("users"), // Add userId for ownership verification
    },
    returns: v.union(v.object({
        url: v.string(),
        galleryId: v.id("gallery"),
        eventName: v.string(),
        guestNickname: v.string(),
        uploadDate: v.string(),
        contentType: v.optional(v.string()),
    }), v.null()),
    handler: async (ctx, args) => {
        // Verify ownership before providing shareable link
        const { galleryRecord, event } = await verifyGalleryOwnership(ctx, args.galleryId, args.userId);

        // Get guest info
        const guest = await ctx.db.get(galleryRecord.guestId);
        if (!guest) {
            return null;
        }

        // Type assertion to ensure guest has the correct type
        const guestRecord = guest as { _id: any; nickname: string; [key: string]: any };

        // Get file metadata
        const fileMetadata = await ctx.db.system.get(galleryRecord.fieldId) as {
            _id: any;
            _creationTime: number;
            contentType?: string;
            sha256: string;
            size: number;
        } | null;
        
        // Get public URL
        const url = await ctx.storage.getUrl(galleryRecord.fieldId);
        if (!url) {
            return null;
        }

        // Format upload date
        const uploadDate = new Date(galleryRecord._creationTime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        return {
            url,
            galleryId: galleryRecord._id,
            eventName: event.name,
            guestNickname: guestRecord.nickname,
            uploadDate,
            contentType: fileMetadata?.contentType,
        };
    },
});

// Consolidated guest functions with improved functionality

export const getGalleryByGuestForGuest = query({
    args: {
        guestId: v.id("guests"),
        eventId: v.id("events"),
    },
    returns: v.array(v.object({
        _id: v.id("gallery"),
        _creationTime: v.number(),
        eventId: v.id("events"),
        guestId: v.id("guests"),
        fieldId: v.id("_storage"),
        url: v.string(),
    })),
    handler: async (ctx, args) => {
        // Verify guest exists and belongs to this event
        const guest = await ctx.db.get(args.guestId);
        if (!guest || guest.eventId !== args.eventId) {
            throw new Error("Guest not found or doesn't belong to this event");
        }
        
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
            .collect();
        
        // Get URLs for each item using shared utility
        const itemsWithUrls = await Promise.all(
            galleryItems.map(async (item) => {
                const fileData = await getFileMetadataWithUrl(ctx, item.fieldId);
                return fileData ? {
                    ...item,
                    url: fileData.url,
                } : null;
            })
        );
        
        return itemsWithUrls.filter((item): item is NonNullable<typeof item> => item !== null); // Only return items with valid URLs
    },
});

export const deleteFromGalleryByGuest = mutation({
    args: {
        galleryId: v.id("gallery"),
        guestId: v.id("guests"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Get the gallery record
        const galleryRecord = await ctx.db.get(args.galleryId);
        if (!galleryRecord) {
            throw new Error("Gallery item not found");
        }
        
        // Verify the guest owns this gallery item
        if (galleryRecord.guestId !== args.guestId) {
            throw new Error("Unauthorized: You don't own this gallery item");
        }
        
        // Delete the file from storage
        await ctx.storage.delete(galleryRecord.fieldId);
        
        // Delete the gallery record
        await ctx.db.delete(args.galleryId);
        
        return null;
    },
});

export const getEventGalleryForGuest = query({
    args: {
        eventId: v.id("events"),
        guestId: v.id("guests"),
    },
    returns: v.array(v.object({
        _id: v.id("gallery"),
        _creationTime: v.number(),
        eventId: v.id("events"),
        guestId: v.id("guests"),
        fieldId: v.id("_storage"),
        url: v.string(),
        guestNickname: v.string(),
    })),
    handler: async (ctx, args) => {
        // Verify guest exists and belongs to this event
        const guest = await ctx.db.get(args.guestId);
        if (!guest || guest.eventId !== args.eventId) {
            throw new Error("Guest not found or doesn't belong to this event");
        }
        
        // Get all gallery items for the event
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();
        
        // Get URLs and guest info for each item using shared utility
        const itemsWithUrls = await Promise.all(
            galleryItems.map(async (item) => {
                const fileData = await getFileMetadataWithUrl(ctx, item.fieldId);
                const itemGuest = await ctx.db.get(item.guestId);
                
                return fileData ? {
                    ...item,
                    url: fileData.url,
                    guestNickname: itemGuest?.nickname || "Unknown",
                } : null;
            })
        );
        
        return itemsWithUrls
            .filter((item): item is NonNullable<typeof item> => item !== null) // Only return items with valid URLs
            .sort((a, b) => b._creationTime - a._creationTime); // Newest first
    },
});

export const getGuestInfo = query({
    args: {
        guestId: v.id("guests"),
    },
    returns: v.union(v.object({
        _id: v.id("guests"),
        nickname: v.string(),
        eventId: v.id("events"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        const guest = await ctx.db.get(args.guestId);
        if (!guest) {
            return null;
        }
        
        return {
            _id: guest._id,
            nickname: guest.nickname,
            eventId: guest.eventId,
            _creationTime: guest._creationTime,
        };
    },
});



