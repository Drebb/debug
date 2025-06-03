"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type EstimatedGuest = "0-100" | "100-200" | "200-300";
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
  estimatedGuest: EstimatedGuest;
  guestLimit: number;
  reviewMode: boolean;
  withVideo: boolean;
  captureType: boolean;
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

const estimatedGuestOptions: EstimatedGuest[] = ["0-100", "100-200", "200-300"];
const statusOptions: EventStatus[] = ["upcoming", "live", "past"];

export default function EditEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id") as Id<"events"> | null;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedEventType, setSelectedEventType] =
    useState<EventType>("Music Festival");
  const [currentStatus, setCurrentStatus] = useState<EventStatus>("upcoming");
  const [currentEstimatedGuest, setCurrentEstimatedGuest] =
    useState<EstimatedGuest>("0-100");

  const event = useQuery(
    api.events.getEventById,
    eventId ? { eventId } : "skip"
  );
  const updateEvent = useMutation(api.events.updateEvent);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>();

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
      setValue("estimatedGuest", event.estimatedGuest);
      setValue("guestLimit", event.guestLimit);
      setValue("reviewMode", event.reviewMode);
      setValue("withVideo", event.withVideo);
      setValue("captureType", event.captureType);
      setValue("terms", event.terms);
      setValue("price", event.price);

      setSelectedEventType(event.eventType);
      setCurrentStatus(event.status);
      setCurrentEstimatedGuest(event.estimatedGuest);

      if (event.addOns) {
        setValue("addOns.filter", event.addOns.filter);
        setValue("addOns.brandedQR", event.addOns.brandedQR);
      }
    }
  }, [event, setValue]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">
                No event ID provided. Please check the URL.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                URL should be: /edit_event?id=YOUR_EVENT_ID
              </p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
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
    if (!eventId) return;

    setIsLoading(true);
    try {
      await updateEvent({
        eventId,
        name: data.name,
        eventType: selectedEventType,
        location: data.location,
        startDate: new Date(data.startDate).getTime(),
        endDate: new Date(data.endDate).getTime(),
        status: currentStatus,
        estimatedGuest: currentEstimatedGuest,
        guestLimit: data.guestLimit,
        reviewMode: data.reviewMode,
        withVideo: data.withVideo,
        captureType: data.captureType,
        terms: data.terms,
        price: data.price,
        addOns: data.addOns,
      });

      toast.success("Event updated successfully!");
      router.push("/dashboard"); // Redirect to dashboard or events list
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
            <CardDescription>
              Update the details for &quot;{event.name}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div>
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    {...register("name", {
                      required: "Event name is required",
                    })}
                    placeholder="Enter event name"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={selectedEventType}
                    onValueChange={(value: EventType) =>
                      setSelectedEventType(value)
                    }
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register("price", {
                      required: "Price is required",
                      min: { value: 0, message: "Price must be non-negative" },
                    })}
                  />
                  {errors.price && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.price.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register("location.address", {
                      required: "Address is required",
                    })}
                    placeholder="Enter street address"
                  />
                  {errors.location?.address && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.location.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register("location.city", {
                        required: "City is required",
                      })}
                      placeholder="Enter city"
                    />
                    {errors.location?.city && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.location.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="region">State/Region</Label>
                    <Input
                      id="region"
                      {...register("location.region", {
                        required: "State/Region is required",
                      })}
                      placeholder="Enter state or region"
                    />
                    {errors.location?.region && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.location.region.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal">Postal Code</Label>
                    <Input
                      id="postal"
                      {...register("location.postal", {
                        required: "Postal code is required",
                      })}
                      placeholder="Enter postal code"
                    />
                    {errors.location?.postal && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.location.postal.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...register("location.country", {
                        required: "Country is required",
                      })}
                      placeholder="Enter country"
                    />
                    {errors.location?.country && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.location.country.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date and Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Date and Time</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date & Time</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      {...register("startDate", {
                        required: "Start date is required",
                      })}
                    />
                    {errors.startDate && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date & Time</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      {...register("endDate", {
                        required: "End date is required",
                      })}
                    />
                    {errors.endDate && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Event Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={currentStatus}
                      onValueChange={(value: EventStatus) =>
                        setCurrentStatus(value)
                      }
                    >
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="estimatedGuest">Estimated Guests</Label>
                    <Select
                      value={currentEstimatedGuest}
                      onValueChange={(value: EstimatedGuest) =>
                        setCurrentEstimatedGuest(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select estimated guests" />
                      </SelectTrigger>
                      <SelectContent>
                        {estimatedGuestOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="guestLimit">Guest Limit</Label>
                  <Input
                    id="guestLimit"
                    type="number"
                    {...register("guestLimit", {
                      required: "Guest limit is required",
                      min: {
                        value: 1,
                        message: "Guest limit must be at least 1",
                      },
                    })}
                  />
                  {errors.guestLimit && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.guestLimit.message}
                    </p>
                  )}
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reviewMode" {...register("reviewMode")} />
                    <Label htmlFor="reviewMode">Review Mode</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="withVideo" {...register("withVideo")} />
                    <Label htmlFor="withVideo">Include Video</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="captureType" {...register("captureType")} />
                    <Label htmlFor="captureType">Capture Type</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" {...register("terms")} />
                    <Label htmlFor="terms">Accept Terms</Label>
                  </div>
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Add-ons</h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="filter" {...register("addOns.filter")} />
                    <Label htmlFor="filter">Filter</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="brandedQR"
                      {...register("addOns.brandedQR")}
                    />
                    <Label htmlFor="brandedQR">Branded QR</Label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
