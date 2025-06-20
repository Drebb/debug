"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { GuestFormSchema, type GuestForm } from "@/lib/validations";

interface GuestRegistrationFormProps {
  eventId: string;
  fingerprint: {
    visitorId: string;
    userAgent: string;
  };
  onSuccess?: () => void;
}

export default function GuestRegistrationForm({
  eventId,
  fingerprint,
  onSuccess,
}: GuestRegistrationFormProps) {
  const saveGuestRecord = useMutation(api.guests.saveGuestRecord);

  const form = useForm<GuestForm>({
    resolver: zodResolver(GuestFormSchema),
    defaultValues: {
      nickname: "",
      email: "",
      socialHandle: "",
    },
  });

  const onSubmit = async (data: GuestForm) => {
    try {
      await saveGuestRecord({
        eventId: eventId as any,
        nickname: data.nickname,
        email: data.email || undefined,
        socialHandle: data.socialHandle || undefined,
        fingerprint,
      });

      toast.success("Successfully registered for the event!");
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error registering guest:", error);
      toast.error(error.message || "Failed to register. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">Join the Event</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Register to start capturing memories at this event
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Nickname *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your nickname" 
                      {...field} 
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      {...field}
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="socialHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Social Handle (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="@yourusername" 
                      {...field}
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full text-sm sm:text-base py-2 sm:py-3"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Registering..." : "Join Event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
