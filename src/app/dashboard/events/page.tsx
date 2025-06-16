"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <Link href="/event/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Event
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Events management coming soon
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This page will show detailed event management features
              </p>
              <Link href="/event/create">
                <Button>Create Your First Event</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 