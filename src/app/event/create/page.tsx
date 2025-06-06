"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

type EventFormData = {
  name: string;
  eventType: string;
  location: {
    address: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  startDate: Date | undefined;
  endDate: Date | undefined;
  basePackage: {
    dailyRate: number;
    totalDays: number;
    totalBasePrice: number;
  };
  guestPackage: {
    tier: "0-100" | "100-200" | "200-300";
    maxGuests: number;
    additionalPrice: number;
  };
  reviewMode: boolean;
  videoPackage: {
    enabled: boolean;
    price: number;
  };
  captureLimitId: string;
  addOns: {
    filter: boolean;
    brandedQR: boolean;
  };
  terms: boolean;
  price: number;
};

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

const guestTierOptions = ["0-100", "100-200", "200-300"];

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useUser();
  const createEvent = useMutation(api.events.createEvent);
  const captureLimits = useQuery(api.captureLimits.getCaptureLimits);
  const convexUser = useQuery(api.users.currentUser);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    eventType: "",
    location: {
      address: "",
      city: "",
      region: "",
      postal: "",
      country: "",
    },
    startDate: undefined,
    endDate: undefined,
    basePackage: {
      dailyRate: 20,
      totalDays: 1,
      totalBasePrice: 20,
    },
    guestPackage: {
      tier: "0-100",
      maxGuests: 100,
      additionalPrice: 150,
    },
    reviewMode: false,
    videoPackage: {
      enabled: false,
      price: 0,
    },
    captureLimitId: "",
    addOns: {
      filter: false,
      brandedQR: false,
    },
    terms: false,
    price: 0,
  });

  const calculateTotalDays = (start: Date, end: Date) => {
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const updated = {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value,
          },
        };

        // Auto-calculate base package pricing
        if (
          parent === "basePackage" ||
          field === "startDate" ||
          field === "endDate"
        ) {
          if (updated.startDate && updated.endDate) {
            const totalDays = calculateTotalDays(
              updated.startDate,
              updated.endDate
            );
            updated.basePackage.totalDays = totalDays;
            updated.basePackage.totalBasePrice =
              updated.basePackage.dailyRate * totalDays;
          }
        }

        // Auto-calculate guest package pricing
        if (parent === "guestPackage" && child === "tier") {
          const tierPricing: Record<
            "0-100" | "100-200" | "200-300",
            { maxGuests: number; additionalPrice: number }
          > = {
            "0-100": { maxGuests: 100, additionalPrice: 150 },
            "100-200": { maxGuests: 200, additionalPrice: 300 },
            "200-300": { maxGuests: 300, additionalPrice: 450 },
          };
          const tier = value as "0-100" | "100-200" | "200-300";
          updated.guestPackage.maxGuests = tierPricing[tier].maxGuests;
          updated.guestPackage.additionalPrice =
            tierPricing[tier].additionalPrice;
        }

        // Auto-calculate video package pricing
        if (parent === "videoPackage" && child === "enabled") {
          updated.videoPackage.price = value ? 49 : 0;
        }

        // Auto-calculate total price
        updated.price =
          updated.basePackage.totalBasePrice +
          updated.guestPackage.additionalPrice +
          updated.videoPackage.price;

        return updated;
      }

      const updated = { ...prev, [field]: value };

      // Handle date changes
      if (field === "startDate" || field === "endDate") {
        if (updated.startDate && updated.endDate) {
          const totalDays = calculateTotalDays(
            updated.startDate,
            updated.endDate
          );
          updated.basePackage.totalDays = totalDays;
          updated.basePackage.totalBasePrice =
            updated.basePackage.dailyRate * totalDays;
          updated.price =
            updated.basePackage.totalBasePrice +
            updated.guestPackage.additionalPrice +
            updated.videoPackage.price;
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!convexUser?._id) {
      toast.error("You must be logged in to create an event");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (!formData.terms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    if (!formData.captureLimitId) {
      toast.error("Please select a capture plan");
      return;
    }

    setIsSubmitting(true);

    try {
      const eventId = await createEvent({
        userId: convexUser._id,
        name: formData.name,
        eventType: formData.eventType as any,
        location: formData.location,
        startDate: formData.startDate.getTime(),
        endDate: formData.endDate.getTime(),
        status: "upcoming",
        guestTier: formData.guestPackage.tier,
        reviewMode: formData.reviewMode,
        captureLimitId: formData.captureLimitId as any,
        addOns: formData.addOns,
        terms: formData.terms,
      });

      toast.success("Event created successfully!");
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!captureLimits) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
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
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div>
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    placeholder="Enter event name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) =>
                      updateFormData("eventType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.location.address}
                    onChange={(e) =>
                      updateFormData("location.address", e.target.value)
                    }
                    placeholder="Street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.location.city}
                      onChange={(e) =>
                        updateFormData("location.city", e.target.value)
                      }
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Region/State *</Label>
                    <Input
                      id="region"
                      value={formData.location.region}
                      onChange={(e) =>
                        updateFormData("location.region", e.target.value)
                      }
                      placeholder="State/Province"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal">Postal Code *</Label>
                    <Input
                      id="postal"
                      value={formData.location.postal}
                      onChange={(e) =>
                        updateFormData("location.postal", e.target.value)
                      }
                      placeholder="Postal code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.location.country}
                      onChange={(e) =>
                        updateFormData("location.country", e.target.value)
                      }
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Event Dates</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate
                            ? format(formData.startDate, "PPP")
                            : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => updateFormData("startDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate
                            ? format(formData.endDate, "PPP")
                            : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => updateFormData("endDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Duration: {formData.basePackage.totalDays} day(s)
                    </p>
                  </div>
                )}
              </div>

              {/* Pricing Packages */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing Packages</h3>

                {/* Guest Package */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Guest Package</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="guestTier">Guest Tier</Label>
                      <Select
                        value={formData.guestPackage.tier}
                        onValueChange={(value) =>
                          updateFormData("guestPackage.tier", value)
                        }
                      >
                        <SelectTrigger>
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
                  </div>
                </div>

                {/* Video Package */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Video Package</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="videoEnabled"
                        checked={formData.videoPackage.enabled}
                        onCheckedChange={(checked) =>
                          updateFormData("videoPackage.enabled", checked)
                        }
                      />
                      <Label htmlFor="videoEnabled">Enable Video Capture</Label>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Price: ${formData.videoPackage.price}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Price */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-green-800">
                      Total Event Price
                    </h4>
                    <p className="text-2xl font-bold text-green-800">
                      ${formData.price}
                    </p>
                  </div>
                  <div className="text-sm text-green-600 mt-2">
                    Base: ${formData.basePackage.totalBasePrice} + Guests: $
                    {formData.guestPackage.additionalPrice} + Video: $
                    {formData.videoPackage.price}
                  </div>
                </div>
              </div>

              {/* Capture Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Capture Settings</h3>

                <div>
                  <Label htmlFor="captureLimitId">Capture Plan *</Label>
                  <Select
                    value={formData.captureLimitId}
                    onValueChange={(value) =>
                      updateFormData("captureLimitId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select capture plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {captureLimits.map((limit) => (
                        <SelectItem key={limit._id} value={limit._id}>
                          {limit.plan} ({limit.planType})
                          {limit.photo && ` - ${limit.photo} photos`}
                          {limit.video && ` - ${limit.video} videos`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="reviewMode"
                    checked={formData.reviewMode}
                    onCheckedChange={(checked) =>
                      updateFormData("reviewMode", checked)
                    }
                  />
                  <Label htmlFor="reviewMode">Enable Review Mode</Label>
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Add-ons</h3>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter"
                    checked={formData.addOns.filter}
                    onCheckedChange={(checked) =>
                      updateFormData("addOns", {
                        ...formData.addOns,
                        filter: checked,
                      })
                    }
                  />
                  <Label htmlFor="filter">Enable Filters</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="brandedQR"
                    checked={formData.addOns.brandedQR}
                    onCheckedChange={(checked) =>
                      updateFormData("addOns", {
                        ...formData.addOns,
                        brandedQR: checked,
                      })
                    }
                  />
                  <Label htmlFor="brandedQR">Branded QR Code</Label>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.terms}
                  onCheckedChange={(checked) =>
                    updateFormData("terms", checked)
                  }
                  required
                />
                <Label htmlFor="terms">
                  I agree to the terms and conditions *
                </Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Link href="/dashboard" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Event..." : "Create Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
