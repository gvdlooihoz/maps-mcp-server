import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { DirectionsResponse } from "../utils/types.js";

export class DirectionsFunction implements McpFunction {

    public name: string = "maps_directions";

    public description: string = "Get directions between two points." ;

    public inputschema = {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "Origin address or coordinates"
          },
          destination: {
            type: "string",
            description: "Destination address or coordinates"
          },
          mode: {
            type: "string",
            description: "Travel mode (driving, walking, bicycling, transit)",
            enum: ["driving", "walking", "bicycling", "transit"]
          }
        },
        required: ["origin", "destination"]
      };

    public zschema = {origin: z.string(), destination: z.string(), mode: z.string().optional()};

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
            if (!args || !args.origin) {
                throw new Error("The origin parameter should be provided to get directions.");
            }
            if (!args || !args.destination) {
                throw new Error("The destination parameter should be provided to get directions.");
            }
            if (args && args.mode) {
                if (!(args.mode === "driving" || args.mode === "walking" || args.mode === "bicycling" || args.mode === "transit")) {
                    throw new Error("The mode parameter should be one of 'driving', 'walking, 'bicycling' or 'transit'.");
                }
            }
            const { origin, destination, mode } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
            url.searchParams.append("origin", origin);
            url.searchParams.append("destination", destination);
            url.searchParams.append("mode", mode);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as DirectionsResponse;
            if (data.status !== "OK") {
                throw new Error(`Directions request failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess({
                routes: data.routes.map((route) => ({
                    summary: route.summary,
                    distance: route.legs[0].distance,
                    duration: route.legs[0].duration,
                    steps: route.legs[0].steps.map((step) => ({
                        instructions: step.html_instructions,
                        distance: step.distance,
                        duration: step.duration,
                        travel_mode: step.travel_mode
                    }))
                }))
            });
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }