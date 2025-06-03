"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function EventAnalyticsPage() {
  const { eventId } = useParams();
  const router = useRouter();

  const guestCount = useQuery(
    api.analytics.getAllGuestCountPerEvent,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadPerEvent,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  const guestList = useQuery(
    api.guests.getGuestList,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  const deleteEvent = useMutation(api.events.deleteEvent);
  const deleteGuest = useMutation(api.guests.deleteGuestRecord);

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    const confirm = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirm) return;

    const result = await deleteEvent({ eventId: eventId as Id<"events"> });
    if (result.success) {
      alert("Event deleted.");
      router.push("/");
    } else {
      alert("Failed to delete event.");
    }
  };

  const handleGuestDelete = async (guestId: Id<"guests">) => {
    const confirm = window.confirm("Delete this guest and their uploads?");
    if (!confirm) return;

    const result = await deleteGuest({ guestId: guestId as Id<"guests"> });
    if (result.success) {
      alert("Guest deleted.");
    } else {
      alert("Failed to delete guest.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Event Analytics</h1>

      {eventId ? (
        <div className="space-y-6">
          {/* Analytics Section */}
          <div className="text-lg space-y-1">
            <p>
              <strong>Event ID:</strong> {eventId}
            </p>
            <p>
              <strong>Total Guests:</strong> {guestCount ?? "Loading..."}
            </p>
            <p>
              <strong>Total Uploads:</strong> {uploadCount ?? "Loading..."}
            </p>
          </div>

          {/* Delete Event */}
          <button
            onClick={handleDeleteEvent}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Delete Event
          </button>

          {/* Guest List */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Guest List</h2>
            {guestList ? (
              guestList.length > 0 ? (
                <table className="w-full table-auto border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1 text-left">Nickname</th>
                      <th className="border px-2 py-1 text-left">Email</th>
                      <th className="border px-2 py-1 text-left">Social</th>
                      <th className="border px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestList.map((guest) => (
                      <tr key={guest._id} className="border-t">
                        <td className="px-2 py-1">{guest.nickname}</td>
                        <td className="px-2 py-1">{guest.email ?? "—"}</td>
                        <td className="px-2 py-1">
                          {guest.socialHandle ?? "—"}
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => handleGuestDelete(guest._id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No guests found for this event.</p>
              )
            ) : (
              <p>Loading guest list...</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-red-500">Loading event data...</p>
      )}
    </div>
  );
}
