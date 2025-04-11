import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { ElevationResponse } from "../utils/types.js";

export class ElevationFunction implements McpFunction {

    public name: string = "maps_elevation";

    public description: string = "Get elevation data for locations on the earth." ;

    public inputschema = {
        type: "object",
        properties: {
          locations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" }
              },
              required: ["latitude", "longitude"]
            },
            description: "Array of locations to get elevation for"
          }
        },
        required: ["locations"]
      };

    public zschema = {locations: z.array(z.object({latitude: z.number(), longitude: z.number()}))};

    public async handleExecution(args: any, extra: any) {
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
            if (!args || !(args.locations && args.locations.length > 0)) {
                throw new Error("The locations parameter should be provided with at least one lat/long to get the elevation of the locations.");
            }
            const { locations } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/elevation/json");
            const locationString = locations
              .map((loc: any) => `${loc.latitude},${loc.longitude}`)
              .join("|");
            url.searchParams.append("locations", locationString);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as ElevationResponse;
            if (data.status !== "OK") {
                throw new Error(`Elevation request failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess(
                {
                    results: data.results.map((result) => ({
                        elevation: result.elevation,
                        location: result.location,
                        resolution: result.resolution
                    }))
                }
            );
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }