"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
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
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const geocoder = useRef<any>(null);

  // Check if Google Maps is already loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        initializeMap();
      } else {
        // If not loaded, we'll wait for it to be loaded externally
        setTimeout(checkGoogleMaps, 100);
      }
    };
    
    checkGoogleMaps();
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
      // Initialize map
      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Initialize marker
      const initialMarker = new window.google.maps.Marker({
        map: initialMap,
        draggable: true,
      });

      // Initialize geocoder
      const initialGeocoder = new window.google.maps.Geocoder();

      setMap(initialMap);
      setMarker(initialMarker);
      geocoder.current = initialGeocoder;

      // Add marker drag listener
      initialMarker.addListener("dragend", handleMarkerDragEnd);
      setIsMapLoading(false);
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsMapLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !geocoder.current) return;

    setIsLoading(true);
    try {
      const result = await geocodeAddress(searchQuery);
      if (result) {
        const { location, addressComponents } = result;
        
        // Update map and marker
        map.setCenter(location);
        map.setZoom(15);
        marker.setPosition(location);

        // Update form with address components
        updateFormWithAddressComponents(addressComponents);
        toast.success("Location found!");
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      toast.error("Could not find the location. Please try a different address.");
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = (address: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      geocoder.current.geocode({ address }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            location,
            addressComponents: results[0].address_components
          });
        } else {
          reject(new Error("Geocoding failed"));
        }
      });
    });
  };

  const handleMarkerDragEnd = () => {
    const position = marker.getPosition();
    
    geocoder.current.geocode({ location: position }, (results: any, status: string) => {
      if (status === "OK" && results[0]) {
        updateFormWithAddressComponents(results[0].address_components);
      }
    });
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

    // Update form values
    form.setValue("location.address", `${streetNumber} ${route}`.trim());
    form.setValue("location.city", city);
    form.setValue("location.region", state);
    form.setValue("location.country", country);
    form.setValue("location.postal", postalCode);
  };

  if (!apiKey) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <p className="text-red-600">Google Maps API key is missing. Please add it to your environment variables.</p>
      </div>
    );
  }

  if (!isGoogleLoaded) {
    return (
      <div className="space-y-4">
        <FormItem>
          <FormLabel>Location *</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                placeholder="Loading Google Maps..."
                value={searchQuery}
                onChange={() => {}}
                disabled
                className="flex-1"
              />
            </FormControl>
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              disabled
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>

        <div className="w-full h-[300px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Location *</FormLabel>
        <div className="flex gap-2">
          <FormControl>
            <Input
              placeholder="Enter an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
              disabled={isLoading || isMapLoading}
            />
          </FormControl>
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={handleSearch}
            disabled={isLoading || isMapLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </div>
        <FormMessage />
      </FormItem>

      <div className="relative">
        {isMapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-[300px] rounded-lg border border-gray-200"
        />
      </div>
    </div>
  );
} 