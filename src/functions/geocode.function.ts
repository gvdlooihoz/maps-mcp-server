import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { GeocodeResponse } from "../utils/types.js";

export class GeoCodeFunction implements McpFunction {

    public name: string = "maps_geocode";

    public description: string = "Convert an address into geographic coordinates." ;

    public inputschema = {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The address to geocode"
          }
        },
        required: ["address"]
      };

    public zschema = {address: z.string()};

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
            if (!args || !args.address) {
                throw new Error("The address parameter should be provided to get the location.");
            }
            const { address } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
            url.searchParams.append("address", address);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as GeocodeResponse;
            if (data.status !== "OK") {
                throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess(
                {
                    location: {
                        latitude: data.results[0].geometry.location.lat,
                        longitude: data.results[0].geometry.location.lng
                    },
                    formatted_address: data.results[0].formatted_address,
                    place_id: data.results[0].place_id
                }
            );
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }