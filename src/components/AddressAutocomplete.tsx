"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressAutocompleteProps {
  form: UseFormReturn<any>;
  apiKey: string;
}

export function AddressAutocomplete({ form, apiKey }: AddressAutocompleteProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const geocoder = useRef<any>(null);

  const openMapModal = () => {
    setIsModalOpen(true);
    // Initialize map after modal opens
    setTimeout(initializeMap, 100);
  };

  const closeMapModal = () => {
    setIsModalOpen(false);
    setIsMapReady(false);
    setMap(null);
    setMarker(null);
  };

  const initializeMap = () => {
    if (!window.google?.maps?.Map || !mapRef.current) {
      toast.error("Google Maps is not available. Please refresh the page.");
      return;
    }

    try {
      // Create map
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapId: "snapclickbang_map", // Add Map ID for Advanced Markers
      });

      // Create marker using AdvancedMarkerElement
      const markerInstance = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: null, // Will be set when user clicks
        gmpDraggable: true,
      });

      // Create geocoder
      const geocoderInstance = new window.google.maps.Geocoder();

      // Add click listener to map
      mapInstance.addListener("click", (event: any) => {
        const latLng = event.latLng;
        markerInstance.position = latLng;
        
        // Reverse geocode to get address
        reverseGeocode(latLng);
      });

      // Add drag listener to marker
      markerInstance.addListener("dragend", () => {
        const position = markerInstance.position;
        if (position) {
          reverseGeocode(position);
        }
      });

      setMap(mapInstance);
      setMarker(markerInstance);
      geocoder.current = geocoderInstance;
      setIsMapReady(true);
      
      toast.success("Map loaded! Click anywhere to set your location.");
    } catch (error) {
      toast.error("Failed to initialize map. Please try again.");
      console.error("Map initialization error:", error);
    }
  };

  const reverseGeocode = (position: any) => {
    if (!geocoder.current) return;

    geocoder.current.geocode({ location: position }, (results: any, status: string) => {
      if (status === "OK" && results[0]) {
        const addressComponents = results[0].address_components;
        const formattedAddress = results[0].formatted_address;
        
        setSelectedLocation({
          position,
          formattedAddress,
          addressComponents
        });
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !geocoder.current || !map || !marker) return;

    setIsLoading(true);
    try {
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.current.geocode({ address: searchQuery }, (results: any, status: string) => {
          if (status === "OK" && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Location not found: ${status}`));
          }
        });
      });

      const location = result.geometry.location;
      
      // Update map and marker
      map.setCenter(location);
      map.setZoom(15);
      marker.position = location;

      // Set selected location
      setSelectedLocation({
        position: location,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components
      });

      toast.success("Location found!");
    } catch (error) {
      toast.error("Could not find the location. Please try a different search.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmLocation = () => {
    if (!selectedLocation) {
      toast.error("Please select a location first.");
      return;
    }

    // Update form with selected location
    updateFormWithAddressComponents(selectedLocation.addressComponents);
    toast.success("Location set successfully!");
    closeMapModal();
  };

  const updateFormWithAddressComponents = (components: any[]) => {
    let streetNumber = "";
    let route = "";
    let city = "";
    let state = "";
    let country = "";
    let postalCode = "";

    for (const component of components) {
      const types = component.types;

      if (types.includes("street_number")) {
        streetNumber = component.long_name;
      }
      if (types.includes("route")) {
        route = component.long_name;
      }
      if (types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }
      if (types.includes("country")) {
        country = component.long_name;
      }
      if (types.includes("postal_code")) {
        postalCode = component.long_name;
      }
    }

    // Build full address including city
    const addressParts = [streetNumber, route, city].filter(Boolean);
    const fullAddress = addressParts.join(" ");

    // Update form values - include city in address, set all available fields
    form.setValue("location.address", fullAddress.trim());
    if (city) form.setValue("location.city", city);
    if (state) form.setValue("location.region", state);
    if (country) form.setValue("location.country", country);
    if (postalCode) form.setValue("location.postal", postalCode);
    
    console.log("Updated form with location data:", {
      address: fullAddress.trim(),
      city: city || "(not auto-filled)",
      region: state || "(not auto-filled)",
      country: country || "(not auto-filled)",
      postal: postalCode || "(not auto-filled)"
    });
  };

  // Get current form values for display
  const currentAddress = form.watch("location.address");
  const currentRegion = form.watch("location.region");
  const currentCountry = form.watch("location.country");

  const displayAddress = [currentAddress, currentRegion, currentCountry]
    .filter(Boolean)
    .join(", ");

  if (!apiKey) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <p className="text-red-600">Google Maps API key is missing.</p>
        <p className="text-red-500 text-sm mt-2">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Location *</FormLabel>
        <div className="space-y-2">
          {displayAddress ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Selected Location:</p>
                  <p className="text-sm text-green-700">{displayAddress}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openMapModal}
                  className="text-green-600 hover:text-green-800"
                >
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={openMapModal}
              className="w-full h-12 border-dashed border-2 hover:border-solid"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Click to set location on map
            </Button>
          )}
        </div>
        <FormMessage />
      </FormItem>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select Your Location</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeMapModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search bar */}
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for an address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSearch()}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>

            {/* Map container */}
            <div className="flex-1 relative">
              {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
              <div 
                ref={mapRef} 
                className="w-full h-full"
              />
            </div>

            {/* Selected location display */}
            {selectedLocation && (
              <div className="p-4 border-t bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Selected Location:</p>
                <p className="text-sm text-gray-600">{selectedLocation.formattedAddress}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t">
              <p className="text-sm text-gray-500">
                Click anywhere on the map to set your location
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeMapModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmLocation}
                  disabled={!selectedLocation}
                >
                  Confirm Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 