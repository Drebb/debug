import { v } from "convex/values";

// Shared helper function to verify event ownership
export async function verifyEventOwnership(ctx: { db: any }, eventId: string, userId: string) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this event");
  }
  return event;
}

// Shared helper function to verify gallery item ownership
export async function verifyGalleryOwnership(ctx: { db: any }, galleryId: string, userId: string) {
  const galleryRecord = await ctx.db.get(galleryId);
  if (!galleryRecord) {
    throw new Error("Gallery item not found");
  }
  
  const event = await ctx.db.get(galleryRecord.eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this gallery item");
  }
  
  return { galleryRecord, event };
}

// Shared helper function to verify guest ownership
export async function verifyGuestOwnership(ctx: any, guestId: string, userId: string) {
  const guest = await ctx.db.get(guestId);
  if (!guest) {
    throw new Error("Guest not found");
  }
  
  const event = await ctx.db.get(guest.eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  
  if (event.userId !== userId) {
    throw new Error("Unauthorized: You don't own this guest");
  }
  
  return { guest, event };
}

// Shared helper function to validate data with Zod
export function validateWithZod<T>(schema: any, data: any, actionName: string): T {
  try {
    return schema.parse(data);
  } catch (error: any) {
    const errorMessage = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || error.message;
    throw new Error(`Validation failed for ${actionName}: ${errorMessage}`);
  }
}

// Shared helper function to generate filename for gallery items
export function generateGalleryFilename(
  eventName: string, 
  guestNickname: string, 
  creationTime: number, 
  contentType?: string
): string {
  const fileExtension = contentType?.includes('image/jpeg') ? '.jpg' : 
                       contentType?.includes('image/png') ? '.png' :
                       contentType?.includes('image/webp') ? '.webp' :
                       contentType?.includes('video/mp4') ? '.mp4' :
                       '';
  
  const date = new Date(creationTime);
  const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedGuestNickname = guestNickname.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedEventName}_${sanitizedGuestNickname}_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}${fileExtension}`;
}

// Shared helper function to get file metadata with URL
export async function getFileMetadataWithUrl(ctx: { db: any, storage: any }, fileId: string) {
  const fileMetadata = await ctx.db.system.get(fileId) as {
    _id: any;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
  } | null;
  
  if (!fileMetadata) {
    return null;
  }

  const url = await ctx.storage.getUrl(fileId);
  if (!url) {
    return null;
  }

  return {
    ...fileMetadata,
    url
  };
} 