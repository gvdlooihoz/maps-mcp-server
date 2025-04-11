import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { PlacesSearchResponse } from "../utils/types.js";

export class SearchPlacesFunction implements McpFunction {

    public name: string = "maps_search_places";

    public description: string = "Search for places of a certain type, optional within a radius from a geiven location." ;

    public inputschema = {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          location: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" }
            },
            description: "Optional center point for the search"
          },
          radius: {
            type: "number",
            description: "Search radius in meters (max 50000)"
          }
        },
        required: ["query"]
      };

    public zschema = {query: z.string(), location: z.object({latitude: z.number(), longitude: z.number()}).optional(), radius: z.number().optional()};

    public async handleExecution(args: any, extra: any) {
        function getDistanceFromLatLonInKm(lat1: number,lon1: number,lat2: number,lon2: number) {
            var R = 6371; // Radius of the earth in km
            var dLat = deg2rad(lat2-lat1);  // deg2rad below
            var dLon = deg2rad(lon2-lon1); 
            var a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
              ; 
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c; // Distance in km
            return d;
        }
          
        function deg2rad(deg: number) {
            return deg * (Math.PI/180)
        }

        try {
            const sessionId = extra.sessionId;
            let apiKey: string | undefined;
            if (sessionId) {
                apiKey = ApiKeyManager.getApiKey(sessionId);
            } else {
                apiKey = process.env.NS_API_KEY;
            }
            if (!apiKey || apiKey.trim() === "") {
                throw new Error("No NS_API_KEY provided. Cannot authorize NS API.")
            }
            if (!args || !args.query) {
                throw new Error("The query parameter should be provided to get places.");
            }
            if (args && args.location) {
                if (!args.location.latitude || !args.location.longitude) {
                    throw new Error("The location parameter should have a latitude and a longitude property.");
                }
            }
            if (args && args.radius) {
                if (args.radius as number > 50000) {
                    throw new Error("The radius parameter should be smaller than 50.000 meter.");
                }
            }
            const { query, location, radius } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
            url.searchParams.append("query", query);
            url.searchParams.append("key", apiKey);
            if (location) {
                url.searchParams.append("location", `${location.latitude},${location.longitude}`);
              }
            if (radius) {
            url.searchParams.append("radius", radius.toString());
            }
            const response = await fetch(url);
            const data = await response.json() as PlacesSearchResponse;
            if (data.status !== "OK") {
                throw new Error(`Search places failed: ${data.error_message || data.status}`);
            }
            const places: Array<any> = [];
            for (const r in data.results) {
                const result = data.results[r];
                const place: any = {};
                place.name = result.name;
                place.formatted_address = result.formatted_address;
                place.location = { latitude: result.geometry.location.lat, longitude: result.geometry.location.lng };
                place.place_id = result.place_id;
                place.rating = result.rating;
                place.types = result.types;
                if (location) {
                    const distance = getDistanceFromLatLonInKm(location.latitude, location.longitude, place.location.latitude, place.location.longitude);
                    place.distance = distance;
                } else {
                    place.distance = 0;
                }
                if (radius && place.distance < radius/1000) {
                    places.push(place);
                } else {
                    places.push(place);
                }
            }
            places.sort((a: any, b: any) => {
                return a.distance - b.distance;
            });
            return ResponseFormatter.formatSuccess({ places: places });          
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }