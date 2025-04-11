import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { DistanceMatrixResponse } from "../utils/types.js";

export class DistanceMatrixFunction implements McpFunction {

    public name: string = "maps_distance_matrix";

    public description: string = "Calculate travel distance and time for multiple origins and destinations." ;

    public inputschema = {
        type: "object",
        properties: {
          origins: {
            type: "array",
            items: { type: "string" },
            description: "Array of origin addresses or coordinates"
          },
          destinations: {
            type: "array",
            items: { type: "string" },
            description: "Array of destination addresses or coordinates"
          },
          mode: {
            type: "string",
            description: "Travel mode (driving, walking, bicycling, transit)",
            enum: ["driving", "walking", "bicycling", "transit"]
          }
        },
        required: ["origins", "destinations", "mode"]
      };

    public zschema = {origins: z.array(z.string()), destinations: z.array(z.string()), mode: z.string().optional()};

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
            if (!args || !(args.origins && args.origins.length > 0)) {
                throw new Error("The origins parameter should be provided with at least one value to get the distance to the destinations.");
            }
            if (!args || !(args.destinations && args.destinations.length > 0)) {
                throw new Error("The destinations parameter should be provided with at least one value to get the distance to the origins.");
            }
            if (!args || !args.mode) {
                throw new Error("The mode parameter should be provided with a value of 'driving', 'walking', 'bicycling' or 'transit'.");
            }
            const { origins, destinations, mode } = args;
            const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
            url.searchParams.append("origins", origins.join("|"));
            url.searchParams.append("destinations", destinations.join("|"));
            url.searchParams.append("mode", mode);
            url.searchParams.append("key", apiKey);
            const response = await fetch(url);
            const data = await response.json() as DistanceMatrixResponse;
            if (data.status !== "OK") {
                throw new Error(`Distance matrix request failed: ${data.error_message || data.status}`);
            }
            return ResponseFormatter.formatSuccess(
                {
                    origin_addresses: data.origin_addresses,
                    destination_addresses: data.destination_addresses,
                    results: data.rows.map((row: any) => ({
                        elements: row.elements.map((element: any) => ({
                            status: element.status,
                            duration: element.duration,
                            distance: element.distance
                        }))
                    }))
                }
            );
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
  }