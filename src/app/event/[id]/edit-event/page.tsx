"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type EventType =
  | "Music Festival"
  | "Automotive Event"
  | "Wedding"
  | "Town Festival"
  | "Birthday"
  | "Graduation"
  | "Reunion"
  | "Conference"
  | "Tradeshow"
  | "Fundraiser"
  | "Sporting Event"
  | "Private Event"
  | "Concert";

type GuestTier = "0-100" | "100-200" | "200-300";
type EventStatus = "upcoming" | "live" | "past";

interface EventFormData {
  name: string;
  eventType: EventType;
  location: {
    address: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  startDate: string;
  endDate: string;
  status: EventStatus;
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
  reviewMode: boolean;
  videoPackage: {
    enabled: boolean;
    price: number;
  };
  terms: boolean;
  price: number;
  addOns?: {
    filter: boolean;
    brandedQR: boolean;
  };
}

const eventTypeOptions: EventType[] = [
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

const guestTierOptions: GuestTier[] = ["0-100", "100-200", "200-300"];
const statusOptions: EventStatus[] = ["upcoming", "live", "past"];

export default function EditEventPage() {
  const router = useRouter();
  const { user } = useUser();
  const { id } = useParams();
  const eventId = id as Id<"events">;

  // Get Convex user (with _id)
  const currentUser = useQuery(api.users.currentUser);
  const convexUserId = currentUser?._id;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedEventType, setSelectedEventType] =
    useState<EventType>("Music Festival");
  const [currentStatus, setCurrentStatus] = useState<EventStatus>("upcoming");
  const [currentGuestTier, setCurrentGuestTier] = useState<GuestTier>("0-100");

  const event = useQuery(
    api.events.getEventById,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const updateEvent = useMutation(api.events.updateEvent);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<EventFormData>();

  const calculateTotalDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const updatePricing = () => {
    const values = getValues();
    const totalDays = calculateTotalDays(values.startDate, values.endDate);
    const totalBasePrice = values.basePackage.dailyRate * totalDays;
    const totalPrice =
      totalBasePrice +
      values.guestPackage.additionalPrice +
      values.videoPackage.price;

    setValue("basePackage.totalDays", totalDays);
    setValue("basePackage.totalBasePrice", totalBasePrice);
    setValue("price", totalPrice);
  };

  // Populate form with existing event data
  useEffect(() => {
    if (event) {
      setValue("name", event.name);
      setValue("location.address", event.location.address);
      setValue("location.city", event.location.city);
      setValue("location.region", event.location.region);
      setValue("location.postal", event.location.postal);
      setValue("location.country", event.location.country);
      setValue(
        "startDate",
        new Date(event.startDate).toISOString().slice(0, 16)
      );
      setValue("endDate", new Date(event.endDate).toISOString().slice(0, 16));
      setValue("status", event.status);
      setValue("basePackage", event.basePackage);
      setValue("guestPackage", event.guestPackage);
      setValue("reviewMode", event.reviewMode);
      setValue("videoPackage", event.videoPackage);
      setValue("terms", event.terms);
      setValue("price", event.price);

      setSelectedEventType(event.eventType);
      setCurrentStatus(event.status);
      setCurrentGuestTier(event.guestPackage.tier);

      if (event.addOns) {
        setValue("addOns.filter", event.addOns.filter);
        setValue("addOns.brandedQR", event.addOns.brandedQR);
      }
    }
  }, [event, setValue]);

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p>Please log in to edit events.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p>Loading event...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">Event not found.</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: EventFormData) => {
    if (!convexUserId) {
      toast.error("You must be logged in to update an event");
      return;
    }

    setIsLoading(true);
    try {
      await updateEvent({
        eventId,
        userId: convexUserId,
        name: data.name,
        eventType: selectedEventType,
        location: data.location,
        startDate: new Date(data.startDate).getTime(),
        endDate: new Date(data.endDate).getTime(),
        status: currentStatus,
        reviewMode: data.reviewMode,
        terms: data.terms,
        addOns: data.addOns,
        // price is not allowed as a direct argument; backend will recalculate
      });

      toast.success("Event updated successfully!");
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestTierChange = (tier: GuestTier) => {
    setCurrentGuestTier(tier);
    const tierPricing = {
      "0-100": { maxGuests: 100, additionalPrice: 150 },
      "100-200": { maxGuests: 200, additionalPrice: 300 },
      "200-300": { maxGuests: 300, additionalPrice: 450 },
    };
    setValue("guestPackage.maxGuests", tierPricing[tier].maxGuests);
    setValue("guestPackage.additionalPrice", tierPricing[tier].additionalPrice);
    updatePricing();
  };

  const handleVideoToggle = (enabled: boolean) => {
    setValue("videoPackage.enabled", enabled);
    setValue("videoPackage.price", enabled ? 49 : 0);
    updatePricing();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
            <CardDescription>Update your event details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div>
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    {...register("name", { required: true })}
                    className="mt-1"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">
                      Event name is required
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={selectedEventType}
                    onValueChange={(value) =>
                      setSelectedEventType(value as EventType)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={currentStatus}
                    onValueChange={(value) =>
                      setCurrentStatus(value as EventStatus)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Location</h3>
                <div>
                  <Label htmlFor="location.address">Address</Label>
                  <Input
                    id="location.address"
                    {...register("location.address", { required: true })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location.city">City</Label>
                    <Input
                      id="location.city"
                      {...register("location.city", { required: true })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location.region">Region/State</Label>
                    <Input
                      id="location.region"
                      {...register("location.region", { required: true })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location.postal">Postal/Zip Code</Label>
                    <Input
                      id="location.postal"
                      {...register("location.postal", { required: true })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location.country">Country</Label>
                    <Input
                      id="location.country"
                      {...register("location.country", { required: true })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Date and Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Date and Time</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date and Time</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      {...register("startDate", { required: true })}
                      onChange={(e) => {
                        setValue("startDate", e.target.value);
                        updatePricing();
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date and Time</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      {...register("endDate", { required: true })}
                      onChange={(e) => {
                        setValue("endDate", e.target.value);
                        updatePricing();
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Packages */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing Packages</h3>

                {/* Base Package */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Base Package</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                      <Input
                        id="dailyRate"
                        type="number"
                        step="0.01"
                        {...register("basePackage.dailyRate", {
                          required: true,
                          valueAsNumber: true,
                        })}
                        onChange={(e) => {
                          setValue(
                            "basePackage.dailyRate",
                            parseFloat(e.target.value) || 0
                          );
                          updatePricing();
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Total Days</Label>
                      <Input
                        type="number"
                        {...register("basePackage.totalDays")}
                        disabled
                        className="bg-gray-50 mt-1"
                      />
                    </div>
                    <div>
                      <Label>Base Price ($)</Label>
                      <Input
                        type="number"
                        {...register("basePackage.totalBasePrice")}
                        disabled
                        className="bg-gray-50 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Guest Package */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Guest Package</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="guestTier">Guest Tier</Label>
                      <Select
                        value={currentGuestTier}
                        onValueChange={handleGuestTierChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select guest tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {guestTierOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option} guests
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max Guests</Label>
                      <Input
                        type="number"
                        {...register("guestPackage.maxGuests")}
                        disabled
                        className="bg-gray-50 mt-1"
                      />
                    </div>
                    <div>
                      <Label>Additional Price ($)</Label>
                      <Input
                        type="number"
                        {...register("guestPackage.additionalPrice")}
                        disabled
                        className="bg-gray-50 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Video Package */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Video Package</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="videoEnabled"
                        {...register("videoPackage.enabled")}
                        onCheckedChange={handleVideoToggle}
                      />
                      <Label htmlFor="videoEnabled">Enable Video Capture</Label>
                    </div>
                    <div className="text-right">
                      <Input
                        type="number"
                        {...register("videoPackage.price")}
                        disabled
                        className="bg-gray-50 w-20 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Price */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-green-800">
                      Total Event Price
                    </h4>
                    <Input
                      type="number"
                      step="0.01"
                      {...register("price", {
                        required: true,
                        valueAsNumber: true,
                      })}
                      disabled
                      className="w-32 text-2xl font-bold text-green-800 bg-transparent border-none text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Options</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reviewMode"
                      {...register("reviewMode")}
                      onCheckedChange={(checked) =>
                        setValue("reviewMode", checked === true)
                      }
                    />
                    <Label htmlFor="reviewMode">Review Mode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      {...register("terms", { required: true })}
                      onCheckedChange={(checked) =>
                        setValue("terms", checked === true)
                      }
                    />
                    <Label htmlFor="terms">
                      I agree to the terms and conditions
                    </Label>
                  </div>
                  {errors.terms && (
                    <p className="text-red-500 text-sm">
                      You must agree to the terms
                    </p>
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <h4 className="font-medium">Add-ons</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addOns.filter"
                      {...register("addOns.filter")}
                      onCheckedChange={(checked) =>
                        setValue("addOns.filter", checked === true)
                      }
                    />
                    <Label htmlFor="addOns.filter">Filter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addOns.brandedQR"
                      {...register("addOns.brandedQR")}
                      onCheckedChange={(checked) =>
                        setValue("addOns.brandedQR", checked === true)
                      }
                    />
                    <Label htmlFor="addOns.brandedQR">Branded QR</Label>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Updating..." : "Update Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
