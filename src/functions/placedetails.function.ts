import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { PlaceDetailsResponse } from "../utils/types.js";

export class PlaceDetailsFunction implements McpFunction {

    public name: string = "maps_place_details";

    public description: string = "Get detailed information about a specific place." ;

    public inputschema = {
        type: "object",
        properties: {
          place_id: {
            type: "string",
            description: "The place ID to get details for"
          }
        },
        required: ["place_id"]
      };

    public zschema = {place_id: z.string()};

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
            if (!args || !args.place_id) {
                throw new Error("The place_id parameter should be provided to get detailed information about the place.");
            }
            const { place_id } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
            url.searchParams.append("place_id", place_id);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as PlaceDetailsResponse;
            if (data.status !== "OK") {
                throw new Error(`Place details request failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess(
                {
                    name: data.result.name,
                    formatted_address: data.result.formatted_address,
                    location: { latitude: data.result.geometry.location.lat, longitude: data.result.geometry.location.lng },
                    formatted_phone_number: data.result.formatted_phone_number,
                    website: data.result.website,
                    rating: data.result.rating,
                    reviews: data.result.reviews,
                    opening_hours: data.result.opening_hours
                }
            );
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }