export interface McpFunction {
    readonly name: string;
    readonly description: string;
    readonly inputschema: any;
    readonly zschema: any;

    handleExecution(args: any, extra?: any): any;
}
  