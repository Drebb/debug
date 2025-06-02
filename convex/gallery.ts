import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadURL = mutation({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const uploadToGallery = mutation({
    args: {
        fileId: v.id("_storage"),
        eventId: v.id("events"),
        guestId: v.id("guests"),
    },
    returns: v.id("gallery"),
    handler: async (ctx, args) => {
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
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // First get the gallery record to find the storage file ID
        const galleryRecord = await ctx.db.get(args.galleryId);
        if (!galleryRecord) {
            throw new Error("Gallery record not found");
        }

        // Delete the file from storage
        await ctx.storage.delete(galleryRecord.fieldId);
        
        // Delete the gallery record
        await ctx.db.delete(args.galleryId);
        
        return null;
    },
});

// Get file URL for display
export const getFileUrl = query({
    args: {
        fileId: v.id("_storage"),
    },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
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
        return await ctx.db.query("gallery").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
    },
});

export const getGalleryByGuest = query({
    args: {
        guestId: v.id("guests"),
    },
    returns: v.array(v.object({
        _id: v.id("gallery"),
        _creationTime: v.number(),
        eventId: v.id("events"),
        guestId: v.id("guests"),
        fieldId: v.id("_storage"),
    })),
    handler: async (ctx, args) => {
        return await ctx.db.query("gallery").withIndex("by_guest", (q) => q.eq("guestId", args.guestId)).collect();
    },
});

// Get image download URL with metadata
export const getImageForDownload = query({
    args: {
        galleryId: v.id("gallery"),
    },
    returns: v.union(v.object({
        url: v.string(),
        filename: v.string(),
        contentType: v.optional(v.string()),
        size: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        // Get gallery record
        const galleryRecord = await ctx.db.get(args.galleryId);
        if (!galleryRecord) {
            return null;
        }

        // Get file metadata from storage system table
        const fileMetadata = await ctx.db.system.get(galleryRecord.fieldId);
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
        // Verify event exists
        const event = await ctx.db.get(args.eventId);
        if (!event) {
            throw new Error("Event not found");
        }

        // Get all gallery items for the event
        const galleryItems = await ctx.db
            .query("gallery")
            .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
            .collect();

        const results = [];

        for (const item of galleryItems) {
            // Get file metadata
            const fileMetadata = await ctx.db.system.get(item.fieldId);
            if (!fileMetadata) continue;

            // Get download URL
            const url = await ctx.storage.getUrl(item.fieldId);
            if (!url) continue;

            // Get guest info
            const guest = await ctx.db.get(item.guestId);
            if (!guest) continue;

            // Generate filename
            const fileExtension = fileMetadata.contentType?.includes('image/jpeg') ? '.jpg' : 
                                 fileMetadata.contentType?.includes('image/png') ? '.png' :
                                 fileMetadata.contentType?.includes('image/webp') ? '.webp' :
                                 fileMetadata.contentType?.includes('video/mp4') ? '.mp4' :
                                 '';
            
            const date = new Date(item._creationTime);
            const filename = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${guest.nickname.replace(/[^a-zA-Z0-9]/g, '_')}_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}${fileExtension}`;

            results.push({
                galleryId: item._id,
                url,
                filename,
                contentType: fileMetadata.contentType,
                size: fileMetadata.size,
                guestNickname: guest.nickname,
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
        // Get gallery record
        const galleryRecord = await ctx.db.get(args.galleryId);
        if (!galleryRecord) {
            return null;
        }

        // Get event info
        const event = await ctx.db.get(galleryRecord.eventId);
        if (!event) {
            return null;
        }

        // Get guest info
        const guest = await ctx.db.get(galleryRecord.guestId);
        if (!guest) {
            return null;
        }

        // Get file metadata
        const fileMetadata = await ctx.db.system.get(galleryRecord.fieldId);
        
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
            guestNickname: guest.nickname,
            uploadDate,
            contentType: fileMetadata?.contentType,
        };
    },
});



