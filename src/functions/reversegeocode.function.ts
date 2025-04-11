import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { GeocodeResponse } from "../utils/types.js";

export class ReverseGeoCodeFunction implements McpFunction {

    public name: string = "maps_reverse_geocode";

    public description: string = "Convert coordinates into an address." ;

    public inputschema = {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude coordinate"
          },
          longitude: {
            type: "number",
            description: "Longitude coordinate"
          }
        },
        required: ["latitude", "longitude"]
      };

    public zschema = {latitude: z.number(), longitude: z.number()};

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
            if (!args || !args.latitude || !args.longitude) {
                throw new Error("The latitude and longitude parameter should be provided to get the address.");
            }
            const { latitude, longitude } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
            url.searchParams.append("latlng", `${latitude},${longitude}`);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as GeocodeResponse;
            if (data.status !== "OK") {
                throw new Error(`Reverse geocoding failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess({formatted_address: data.results[0].formatted_address, place_id: data.results[0].place_id});
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }