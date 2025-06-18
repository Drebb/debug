"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, LayoutDashboard, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

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
import { Id } from "../../../../convex/_generated/dataModel";
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

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useUser();
  const createEvent = useMutation(api.events.createEvent);
  const convexUser = useQuery(api.users.currentUser);

  // Fetch guest packages and capture limits from Convex
  const guestPackages = useQuery(api.guestPackages.getGuestPackageTiers);
  const captureLimits = useQuery(api.captureLimits.getCaptureLimits);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const selectedGuestPackage = guestPackages!.find(
      (pkg) => pkg._id === guestPackageId
    );
    const guestPackagePrice = selectedGuestPackage?.price || 0;

    // Video package pricing
    const videoPackagePrice = videoPackage ? 49 : 0;

    // Capture package pricing
    const selectedCaptureLimit = captureLimits!.find(
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

  if (!captureLimits || !guestPackages) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  const pricing = calculatePricing();

  const onSubmit = async (data: EventForm) => {
    console.log("Form submission started");
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    
    if (!convexUser?._id) {
      toast.error("You must be logged in to create an event");
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time for accurate timestamps
      const startDateTime = combineDateTime(data.startDate, data.startTime);
      const endDateTime = combineDateTime(data.endDate, data.endTime);

      console.log("Creating event with data:", {
        userId: convexUser._id,
        name: data.name,
        eventType: data.eventType,
        location: data.location,
        startDate: startDateTime.getTime(),
        endDate: endDateTime.getTime(),
        status: "upcoming",
        guestPackageId: data.guestPackageId,
        reviewMode: data.reviewMode,
        captureLimitId: data.captureLimitId,
        addOns: data.addOns,
        terms: data.terms,
      });

      const eventId = await createEvent({
        userId: convexUser._id,
        name: data.name,
        eventType: data.eventType as any,
        location: data.location,
        startDate: startDateTime.getTime(),
        endDate: endDateTime.getTime(),
        status: "upcoming",
        guestPackageId: data.guestPackageId as Id<"guestPackageTiers">,
        reviewMode: data.reviewMode,
        captureLimitId: data.captureLimitId as Id<"captureLimits">,
        addOns: data.addOns,
        terms: data.terms,
      });

      console.log("Event created successfully with ID:", eventId);
      toast.success("Event created successfully!");
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast.error("Please fix the form errors before submitting");
              })}
              className="space-y-8"
            >
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Form (Left, spans 2 columns) */}
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                          </Button>
                        </Link>
                      </div>
                      <CardTitle className="text-3xl font-bold">
                        Create New Event
                      </CardTitle>
                      <CardDescription>
                        Fill out the details below to create your event
                      </CardDescription>
                      {Object.keys(form.formState.errors).length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                          <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                          <ul className="text-red-700 text-sm space-y-1">
                            {Object.entries(form.formState.errors).map(([field, error]) => (
                              <li key={field}>
                                • {field}: {error?.message || "This field is required"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Basic Information
                        </h3>

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter event name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="eventType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Type *</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select event type" />
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

                      {/* Location */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Location
                        </h3>

                        <AddressAutocomplete form={form} apiKey={GOOGLE_MAPS_API_KEY} />

                        <div className="text-sm text-gray-600 mb-3">
                          💡 The fields below will be auto-filled when you select a location on the map. You can also edit them manually if needed.
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="location.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter city name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location.region"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Region/State *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter state/province" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="location.postal"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal Code *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter postal code" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location.country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter country" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Event Dates */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Event Dates & Times
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date & Time *</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value && form.watch("startTime")
                                          ? `${format(field.value, "PPP")} at ${form.watch("startTime")}`
                                          : "Pick start date & time"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <div className="p-4 space-y-4">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                      />
                                      <div className="border-t pt-4">
                                        <FormField
                                          control={form.control}
                                          name="startTime"
                                          render={({ field: timeField }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium">
                                                Start Time
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="time"
                                                  {...timeField}
                                                  className="mt-1"
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date & Time *</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value && form.watch("endTime")
                                          ? `${format(field.value, "PPP")} at ${form.watch("endTime")}`
                                          : "Pick end date & time"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <div className="p-4 space-y-4">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                      />
                                      <div className="border-t pt-4">
                                        <FormField
                                          control={form.control}
                                          name="endTime"
                                          render={({ field: timeField }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium">
                                                End Time
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="time"
                                                  {...timeField}
                                                  className="mt-1"
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("startDate") && form.watch("endDate") && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-blue-700">
                                  Duration:{" "}
                                  {calculateTotalDays(
                                    form.watch("startDate"),
                                    form.watch("endDate")
                                  )}{" "}
                                  day(s)
                                </p>
                                {form.watch("startTime") && form.watch("endTime") && (
                                  <p className="text-sm text-blue-700">
                                    Start:{" "}
                                    {form.watch("startDate")
                                      ? format(form.watch("startDate"), "PPP")
                                      : ""}{" "}
                                    at {form.watch("startTime")}
                                    <br />
                                    End:{" "}
                                    {form.watch("endDate")
                                      ? format(form.watch("endDate"), "PPP")
                                      : ""}{" "}
                                    at {form.watch("endTime")}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-blue-700 font-medium">
                                  Base Package: ${" "}
                                  {BASE_DAILY_RATE *
                                    (form.watch("startDate") && form.watch("endDate")
                                      ? calculateTotalDays(
                                          form.watch("startDate"),
                                          form.watch("endDate")
                                        )
                                      : 0)}
                                </p>
                                <p className="text-xs text-blue-600">
                                  ${BASE_DAILY_RATE}/day ×{" "}
                                  {form.watch("startDate") && form.watch("endDate")
                                    ? calculateTotalDays(
                                        form.watch("startDate"),
                                        form.watch("endDate")
                                      )
                                    : 0}{" "}
                                  days
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Guest Package */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Guest Package
                        </h3>

                        <FormField
                          control={form.control}
                          name="guestPackageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Guest Package</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-3 gap-3">
                                  {guestPackages.map((guestPackage) => (
                                    <div
                                      key={guestPackage._id}
                                      className={cn(
                                        "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                        field.value === guestPackage._id
                                          ? "border-blue-500 bg-blue-50"
                                          : "border-gray-200 hover:border-gray-300"
                                      )}
                                      onClick={() => field.onChange(guestPackage._id)}
                                    >
                                      <div className="text-center">
                                        <h5 className="font-medium">
                                          {guestPackage.tier} guests
                                        </h5>
                                        <p className="text-sm text-gray-600 mt-1">
                                          Up to {guestPackage.maxGuests} guests
                                        </p>
                                        <p className="text-lg font-bold text-green-600 mt-2">
                                          +${guestPackage.price}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Review Mode */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Review Mode
                        </h3>

                        <FormField
                          control={form.control}
                          name="reviewMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="grid grid-cols-2 gap-4">
                                  <div
                                    className={cn(
                                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                      !field.value
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() => field.onChange(false)}
                                  >
                                    <div className="text-center">
                                      <h5 className="font-medium">
                                        Disposable Camera
                                      </h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Photos are automatically deleted after 24
                                        hours
                                      </p>
                                      <p className="text-sm font-medium text-green-600 mt-2">
                                        Included
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className={cn(
                                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                      field.value
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() => field.onChange(true)}
                                  >
                                    <div className="text-center">
                                      <h5 className="font-medium">
                                        Review Gallery Photos
                                      </h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Photos can be reviewed by the event organizer
                                      </p>
                                      <p className="text-sm font-medium text-green-600 mt-2">
                                        Included
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Video Package Selection */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Media Package
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={cn(
                              "p-4 border-2 rounded-lg cursor-pointer transition-all",
                              !form.watch("videoPackage")
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => {
                              form.setValue("videoPackage", false);
                              form.setValue("captureLimitId", ""); // Reset capture plan selection
                            }}
                          >
                            <div className="text-center">
                              <h5 className="font-medium">Photos Only</h5>
                              <p className="text-sm text-gray-600 mt-1">
                                Capture photos only at your event
                              </p>
                              <p className="text-sm font-medium text-green-600 mt-2">
                                Included
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "p-4 border-2 rounded-lg cursor-pointer transition-all",
                              form.watch("videoPackage")
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => {
                              form.setValue("videoPackage", true);
                              form.setValue("captureLimitId", ""); // Reset capture plan selection
                            }}
                          >
                            <div className="text-center">
                              <h5 className="font-medium">Photos + Videos</h5>
                              <p className="text-sm text-gray-600 mt-1">
                                Capture both photos and videos
                              </p>
                              <p className="text-lg font-bold text-blue-600 mt-2">
                                +$49
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Capture Settings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Capture Settings
                        </h3>
                        <div>
                          <FormField
                            control={form.control}
                            name="captureLimitId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Capture Plan *</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-1 gap-3">
                                    {captureLimits
                                      .filter((limit) => {
                                        const hasVideoPackage =
                                          form.watch("videoPackage");
                                        if (hasVideoPackage) {
                                          return limit.planType === "photos-videos";
                                        } else {
                                          return limit.planType === "photos-only";
                                        }
                                      })
                                      .map((limit) => {
                                        const isSelected = field.value === limit._id;
                                        const selectedGuestPackageId =
                                          form.watch("guestPackageId");
                                        const selectedGuestPackage =
                                          guestPackages.find(
                                            (pkg) =>
                                              pkg._id === selectedGuestPackageId
                                          );
                                        const maxGuests =
                                          selectedGuestPackage?.maxGuests || 0;
                                        const totalCapturePrice =
                                          limit.pricePerGuest * maxGuests;

                                        return (
                                          <div
                                            key={limit._id}
                                            className={cn(
                                              "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                              isSelected
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                            )}
                                            onClick={() => field.onChange(limit._id)}
                                          >
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <h5 className="font-medium">
                                                  {limit.plan} Plan
                                                </h5>
                                                <p className="text-sm text-gray-600">
                                                  {limit.planType === "photos-only"
                                                    ? "Photos Only"
                                                    : "Photos + Videos"}
                                                  {limit.photo === -1
                                                    ? " (Unlimited photos"
                                                    : ` (${limit.photo} photos`}
                                                  {limit.planType ===
                                                    "photos-videos" &&
                                                    limit.video &&
                                                    limit.video > 0 &&
                                                    `, ${limit.video} videos`}
                                                  )
                                                </p>
                                                {limit.pricePerGuest > 0 && (
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    ${limit.pricePerGuest} per guest ×{" "}
                                                    {maxGuests} guests
                                                  </p>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                {limit.pricePerGuest > 0 ? (
                                                  <p className="text-lg font-bold text-blue-600">
                                                    +${totalCapturePrice}
                                                  </p>
                                                ) : (
                                                  <p className="text-sm font-medium text-green-600">
                                                    Included
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            {form.watch("videoPackage")
                              ? "Choose a plan that includes both photos and videos."
                              : "Choose a plan for photos only."}
                          </p>
                        </div>
                      </div>

                      {/* Add-ons */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">
                          Add-ons
                        </h3>

                        <FormField
                          control={form.control}
                          name="addOns"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="grid grid-cols-3 gap-4">
                                  <div
                                    className={cn(
                                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                      !field.value.filter && !field.value.brandedQR
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() =>
                                      field.onChange({
                                        filter: false,
                                        brandedQR: false,
                                      })
                                    }
                                  >
                                    <div className="text-center">
                                      <h5 className="font-medium">None</h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        No additional features
                                      </p>
                                      <p className="text-sm font-medium text-green-600 mt-2">
                                        Free
                                      </p>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                      field.value.filter
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() =>
                                      field.onChange({
                                        filter: !field.value.filter,
                                        brandedQR: field.value.brandedQR,
                                      })
                                    }
                                  >
                                    <div className="text-center">
                                      <h5 className="font-medium">Enable Filters</h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Add photo filters to your event
                                      </p>
                                      <p className="text-sm font-medium text-green-600 mt-2">
                                        Included
                                      </p>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                                      field.value.brandedQR
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() =>
                                      field.onChange({
                                        filter: field.value.filter,
                                        brandedQR: !field.value.brandedQR,
                                      })
                                    }
                                  >
                                    <div className="text-center">
                                      <h5 className="font-medium">Branded QR Code</h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Custom branded QR code for your event
                                      </p>
                                      <p className="text-sm font-medium text-green-600 mt-2">
                                        Included
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {(form.watch("addOns.filter") ||
                          form.watch("addOns.brandedQR")) && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                              Selected add-ons:{" "}
                              {[
                                form.watch("addOns.filter") && "Enable Filters",
                                form.watch("addOns.brandedQR") && "Branded QR Code",
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Sidebar (Right) */}
                <div className="md:col-span-1">
                  <Card className="sticky top-8">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">Price Summary</CardTitle>
                      <CardDescription>
                        Estimated total based on your selections
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Total Cost Box */}
                      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-gray-700">Total Cost</span>
                          <span className="text-2xl font-bold text-gray-900 mt-1">+${pricing.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Base Package</span>
                          <span className="font-medium">${pricing.basePackage.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Guest Fee ({pricing.selectedGuestPackage ? pricing.selectedGuestPackage.maxGuests : 0} guests)</span>
                          <span className="font-medium">${pricing.guestPackage.price.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Surcharge/usage note */}
                      <div className="text-xs text-gray-500 mt-2">
                        Final price may vary based on actual guest count and usage; you'll only be charged for the resources used.
                      </div>
                      {/* Terms & Conditions */}
                      <div className="flex items-center space-x-2 pt-2">
                        <FormField
                          control={form.control}
                          name="terms"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  required
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Label htmlFor="terms" className="text-sm">
                          Accept Terms and Conditions
                        </Label>
                      </div>
                      {/* Create Event Button */}
                      <Button
                        type="submit"
                        className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold rounded-lg py-2"
                        disabled={isSubmitting || !form.watch("terms")}
                      >
                        {isSubmitting ? "Creating Event..." : "Create Event"}
                      </Button>
                      {/* Capture Limits Note */}
                      <div className="text-xs text-red-500 mt-2">
                        *Capture Limits, you only pay for what you used after the event
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
