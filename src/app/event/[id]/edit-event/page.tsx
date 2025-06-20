"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, LayoutDashboard, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import react-hook-form and Zod
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EventFormSchema, type EventForm } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Sidebar from "@/components/Sidebar";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const eventTypes = [
  "Music Festival",
  "Automotive Event",
  "Wedding",
  "Town Festival",
  "Birthday",
  "Graduation",
  "Reunion",
  "Conference",
  "Tradeshow",
  "Fundraiser",
  "Sporting Event",
  "Private Event",
  "Concert",
];

// Base daily rate
const BASE_DAILY_RATE = 20;

// Add Google Maps API key (used by AddressAutocomplete)
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function EditEventPage() {
  const router = useRouter();
  const { user } = useUser();
  const { id } = useParams();
  const eventId = id as Id<"events">;

  const updateEvent = useMutation(api.events.updateEvent);
  const convexUser = useQuery(api.users.currentUser);

  // Fetch guest packages and capture limits from Convex
  const guestPackages = useQuery(api.guestPackages.getGuestPackageTiers);
  const captureLimits = useQuery(api.captureLimits.getCaptureLimits);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = useQuery(
    api.events.getEventById,
    eventId && convexUser?._id ? { eventId, userId: convexUser._id } : "skip"
  );

  // Initialize react-hook-form with Zod validation
  const form = useForm<EventForm>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      name: "",
      eventType: "Music Festival" as const,
      location: {
        address: "",
        city: "",
        region: "",
        postal: "",
        country: "",
      },
      startDate: undefined,
      endDate: undefined,
      startTime: "09:00",
      endTime: "17:00",
      guestPackageId: "",
      reviewMode: false,
      videoPackage: false,
      captureLimitId: "",
      addOns: {
        filter: false,
        brandedQR: false,
      },
      terms: false,
    },
  });

  // Watch form values for live pricing
  const watchedValues = form.watch();

  // Helper functions - defined before use
  const calculateTotalDays = (start: Date, end: Date) => {
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
  };

  const combineDateTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  // Calculate pricing in real-time based on form values
  const calculatePricing = () => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    const guestPackageId = form.watch("guestPackageId");
    const captureLimitId = form.watch("captureLimitId");
    const videoPackage = form.watch("videoPackage");

    // Base package calculation
    const totalDays =
      startDate && endDate ? calculateTotalDays(startDate, endDate) : 1;
    const basePackagePrice = BASE_DAILY_RATE * totalDays;

    // Guest package pricing
    const selectedGuestPackage = guestPackages?.find(
      (pkg) => pkg._id === guestPackageId
    );
    const guestPackagePrice = selectedGuestPackage?.price || 0;

    // Video package pricing
    const videoPackagePrice = videoPackage ? 49 : 0;

    // Capture package pricing
    const selectedCaptureLimit = captureLimits?.find(
      (limit) => limit._id === captureLimitId
    );
    const capturePackagePrice =
      selectedCaptureLimit && selectedGuestPackage
        ? selectedCaptureLimit.pricePerGuest * selectedGuestPackage.maxGuests
        : 0;

    // Total price
    const totalPrice =
      basePackagePrice +
      guestPackagePrice +
      videoPackagePrice +
      capturePackagePrice;

    return {
      basePackage: {
        price: basePackagePrice,
        totalDays,
        description: `Base Package (${totalDays} ${totalDays === 1 ? "day" : "days"})`,
      },
      guestPackage: {
        price: guestPackagePrice,
        description: selectedGuestPackage
          ? `Guest Package (${selectedGuestPackage.tier})`
          : "Guest Package",
      },
      videoPackage: {
        price: videoPackagePrice,
        description: "Video Package",
      },
      capturePackage: {
        price: capturePackagePrice,
        description:
          selectedCaptureLimit && selectedGuestPackage
            ? `Capture Package ($${selectedCaptureLimit.pricePerGuest} × ${selectedGuestPackage.maxGuests} guests)`
            : "Capture Package",
      },
      totalPrice,
      selectedGuestPackage,
      selectedCaptureLimit,
    };
  };

  // Update form when event data loads
  useEffect(() => {
    if (event && !form.formState.isDirty) {
      // Convert timestamps to dates
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      // Extract time from dates
      const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      // Set form values
      form.reset({
        name: event.name,
        eventType: event.eventType as any,
        location: event.location,
        startDate: startDate,
        endDate: endDate,
        startTime: startTime,
        endTime: endTime,
        guestPackageId: event.guestPackageId,
        reviewMode: event.reviewMode,
        videoPackage: event.videoPackage.enabled,
        captureLimitId: event.captureLimitId,
        addOns: event.addOns || { filter: false, brandedQR: false },
        terms: event.terms,
      });
    }
  }, [event, form]);

  const onSubmit = async (data: EventForm) => {
    if (!convexUser?._id) {
      toast.error("Please log in to update this event");
      return;
    }

    try {
      setIsSubmitting(true);

      // Combine date and time for start and end
      const startDateTime = combineDateTime(data.startDate, data.startTime);
      const endDateTime = combineDateTime(data.endDate, data.endTime);

      // Prepare the update data
      const updateData = {
        eventId,
        userId: convexUser._id,
        name: data.name,
        eventType: data.eventType,
        location: data.location,
        startDate: startDateTime.getTime(),
        endDate: endDateTime.getTime(),
        guestPackageId: data.guestPackageId as Id<"guestPackageTiers">,
        reviewMode: data.reviewMode,
        captureLimitId: data.captureLimitId as Id<"captureLimits">,
        addOns: data.addOns,
        terms: data.terms,
      };

      await updateEvent(updateData);

      toast.success("Event updated successfully!");
      router.push(`/event/${eventId}`);
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while data is being fetched
  if (!event || !guestPackages || !captureLimits || !convexUser) {
    return (
      <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading event data...</p>
          </div>
        </div>
      </div>
    );
  }

  const pricing = calculatePricing();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-4 w-full">
          {/* Back to Event Link */}
          <div className="mb-2">
                        <Link
                          href={`/event/${eventId}`}
              className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Back to Event
                        </Link>
                      </div>

          <h1 className="text-xl font-bold mb-1">Edit Event</h1>
          <p className="text-sm text-gray-600 mb-3">Set up your event details and customize options</p>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Main Form */}
            <div className="flex-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  {/* Basic Information Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Event Name</FormLabel>
                              <FormControl>
                              <Input 
                                placeholder="My Event" 
                                {...field} 
                                className="w-full h-9 border-gray-200"
                              />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>

                    <div>
                        <FormField
                          control={form.control}
                          name="eventType"
                          render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Event Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                <SelectTrigger className="h-9 border-gray-200">
                                  <SelectValue placeholder="Select Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {eventTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                    <div>
                          <FormField
                            control={form.control}
                        name="location.address"
                            render={({ field }) => (
                              <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Location</FormLabel>
                                <FormControl>
                              <Input 
                                placeholder="Enter address" 
                                {...field} 
                                className="w-full h-9 border-gray-200"
                              />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                  {/* Date and Guest Information Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Start Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                      "w-full justify-start text-left font-normal h-9 border-gray-200",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "MM/dd/yyyy") : "mm/dd/yyyy"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                      />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                    </div>

                    <div>
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">End Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                      "w-full justify-start text-left font-normal h-9 border-gray-200",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "MM/dd/yyyy") : "mm/dd/yyyy"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                      />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>

                    <div>
                        <FormField
                          control={form.control}
                          name="guestPackageId"
                          render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Estimated Number of Guests</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                <SelectTrigger className="h-9 border-gray-200">
                                  <SelectValue placeholder="1 - 100 Guests" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {guestPackages?.map((pkg) => (
                                    <SelectItem key={pkg._id} value={pkg._id}>
                                    {pkg.tier} ({pkg.maxGuests} guests)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <div className="text-xs text-blue-600 mt-1">
                              ${pricing.basePackage.price} ({pricing.basePackage.totalDays} days) • $99 per day
                            </div>
                            <div className="text-xs text-blue-600">
                              15 Per Guest Surcharge ⓘ
                            </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                  </div>

                  {/* Guest Package */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-2">Guest Package</h3>
                      <p className="text-sm text-gray-600 mb-3">Guest Package</p>
                      
                      <h4 className="text-sm font-medium mb-2">Review Mode</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <FormField
                          control={form.control}
                          name="reviewMode"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                !field.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                              )}
                              onClick={() => field.onChange(false)}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Disposable Camera</h5>
                                <p className="text-sm text-gray-600 mb-2">Photos are automatically deleted after 24 hours</p>
                                <span className="text-sm font-medium text-green-600">Included</span>
                              </div>
                            </div>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="reviewMode"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                field.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                              )}
                              onClick={() => field.onChange(true)}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Review Gallery Photos</h5>
                                <p className="text-sm text-gray-600 mb-2">Photos can be reviewed by the event organizer</p>
                                <span className="text-sm font-medium text-green-600">Included</span>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>

                    {/* Media Package */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">Media Package</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <FormField
                          control={form.control}
                          name="videoPackage"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                !field.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                              )}
                              onClick={() => field.onChange(false)}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Photos Only</h5>
                                <p className="text-sm text-gray-600 mb-2">Capture photos only at your event</p>
                                <span className="text-sm font-medium text-green-600">Included</span>
                              </div>
                            </div>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="videoPackage"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                field.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                              )}
                              onClick={() => field.onChange(true)}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Photos + Videos</h5>
                                <p className="text-sm text-gray-600 mb-2">Capture both photos and videos</p>
                                <span className="text-lg font-bold text-blue-600">+$49</span>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>

                    {/* Capture Settings */}
                    <div>
                      <h3 className="text-base font-semibold mb-2">Capture Settings</h3>
                      <p className="text-sm text-gray-600 mb-3">Select Capture Plan *</p>
                      <p className="text-sm text-gray-600 mb-3">Choose a plan for photos only.</p>
                      
                      <FormField
                        control={form.control}
                        name="captureLimitId"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                              {captureLimits?.slice(0, 3).map((limit, index) => (
                                <div 
                                  key={limit._id}
                                  className={cn(
                                    "border rounded-lg p-4 cursor-pointer transition-colors text-center",
                                    field.value === limit._id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                                  )}
                                  onClick={() => field.onChange(limit._id)}
                                >
                                  <h5 className="font-medium mb-1">Standard</h5>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {index === 0 && "15 photos per guest"}
                                    {index === 1 && "2 videos per guest"}
                                    {index === 2 && "50 photos + 1 video"}
                                  </p>
                                  <div className="text-sm font-medium">
                                    {index === 0 && "Included in base price"}
                                    {index === 1 && "+$5 per guest"}
                                    {index === 2 && "+$1 per guest"}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Add-ons */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">Add-ons</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="addOns.filter"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                !field.value && !form.watch("addOns.brandedQR") ? "border-blue-500 bg-blue-50" : "border-gray-200"
                              )}
                              onClick={() => {
                                form.setValue("addOns.filter", false);
                                form.setValue("addOns.brandedQR", false);
                              }}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">None</h5>
                                <p className="text-sm text-gray-600 mb-2">No additional features</p>
                                <span className="text-sm font-medium text-green-600">Free</span>
                              </div>
                            </div>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="addOns.filter"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                field.value ? "border-blue-500 bg-blue-50" : "border-gray-200"
                              )}
                              onClick={() => {
                                field.onChange(!field.value);
                                if (!field.value) {
                                  form.setValue("addOns.brandedQR", false);
                                }
                              }}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Enable Filters</h5>
                                <p className="text-sm text-gray-600 mb-2">Add photo filters to your event</p>
                                <span className="text-sm font-medium text-green-600">Included</span>
                              </div>
                            </div>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="addOns.brandedQR"
                          render={({ field }) => (
                            <div 
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors",
                                field.value ? "border-blue-500 bg-blue-50" : "border-gray-200"
                              )}
                              onClick={() => {
                                field.onChange(!field.value);
                                if (!field.value) {
                                  form.setValue("addOns.filter", false);
                                }
                              }}
                            >
                              <div className="text-center">
                                <h5 className="font-medium mb-2">Branded QR Code</h5>
                                <p className="text-sm text-gray-600 mb-2">Custom branded QR code for your event</p>
                                <span className="text-sm font-medium text-green-600">Included</span>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms and Submit */}
                  <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="terms"
                          render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                              I agree to the Terms and Conditions
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  By checking this box, you agree to our terms of service
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                    <Button
                      type="submit"
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Updating Event..." : "Update Event"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            
            {/* Price Summary Sidebar */}
            <div className="w-full md:w-72">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold mb-2">Price Summary</h3>
                <p className="text-sm text-gray-500 mb-3">Estimated total based on your selections</p>
                
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost</span>
                    <span className="text-xl font-bold text-blue-700">+${pricing.totalPrice.toFixed(2)}</span>
                      </div>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <span>Base Package</span>
                      <span className="ml-1 text-blue-500 text-xs">ⓘ</span>
                      </div>
                    <span>${pricing.basePackage.price.toFixed(2)}</span>
                        </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span>Guest Fee (100 guests)</span>
                    <span>$0.00</span>
                        </div>
                        </div>
                
                <div className="mb-3">
                  <div className="flex items-center mb-2">
                    <Checkbox 
                      id="terms-sidebar"
                      checked={form.watch("terms")}
                      onCheckedChange={(checked) => form.setValue("terms", !!checked)}
                      className="mr-2"
                    />
                    <Label htmlFor="terms-sidebar" className="text-sm">Accept <span className="text-blue-600">Terms and Conditions</span></Label>
                        </div>
                      </div>
                
                      <Button
                        type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={isSubmitting || !form.watch("terms")}
                  onClick={form.handleSubmit(onSubmit)}
                      >
                        {isSubmitting ? "Updating..." : "Update Event"}
                      </Button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  *Capture Limits: you only pay for what you need after the event
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}