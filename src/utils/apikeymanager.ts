export class ApiKeyManager {

    static apiKeys: {[sessionId: string]: string} = {};

    static getApiKey(sessionId: string): string {
        return this.apiKeys[sessionId];
    }
    
    static setApiKey(sessionId: string, apiKey: string) {
        this.apiKeys[sessionId] = apiKey;
    }
}