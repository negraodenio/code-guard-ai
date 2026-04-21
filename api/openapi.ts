import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Edge Runtime for Vercel
export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        // In Vercel, we need to read the file from the project root
        // Since Edge Runtime has limitations, we'll serve a static response
        const openapiSpec = {
            openapi: "3.0.3",
            info: {
                title: "CodeGuard AI API",
                description: "REST API for CodeGuard AI compliance scanning and analysis",
                version: "1.0.0",
                contact: {
                    name: "CodeGuard AI Support",
                    url: "https://code-guard.eu",
                    email: "support@code-guard.eu"
                }
            },
            servers: [
                {
                    url: "https://your-app.vercel.app",
                    description: "Production server"
                }
            ],
            security: [
                {
                    ApiKeyAuth: []
                }
            ],
            paths: {
                "/api/scan": {
                    post: {
                        summary: "Run compliance audit",
                        description: "Execute a deep compliance audit on code for GDPR, LGPD, PCI, and other frameworks",
                        operationId: "scanCompliance",
                        requestBody: {
                            required: true,
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        required: ["region"],
                                        properties: {
                                            region: {
                                                type: "string",
                                                enum: ["BR", "EU"],
                                                description: "Regulatory region"
                                            },
                                            frameworks: {
                                                type: "array",
                                                items: { type: "string" },
                                                description: "Specific framework IDs to check"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            "200": {
                                description: "Scan completed successfully",
                                content: {
                                    "application/json": {
                                        schema: { $ref: "#/components/schemas/ScanResult" }
                                    }
                                }
                            },
                            "400": { description: "Invalid input" },
                            "401": { description: "Unauthorized" },
                            "429": { description: "Rate limit exceeded" },
                            "500": { description: "Internal server error" }
                        }
                    }
                },
                "/api/graph": {
                    post: {
                        summary: "Generate dependency graph",
                        description: "Generate repository intelligence graph showing dependencies and sensitive data flows",
                        operationId: "generateGraph",
                        responses: {
                            "200": {
                                description: "Graph generated successfully",
                                content: {
                                    "application/json": {
                                        schema: { $ref: "#/components/schemas/GraphResult" }
                                    }
                                }
                            },
                            "401": { description: "Unauthorized" },
                            "429": { description: "Rate limit exceeded" },
                            "500": { description: "Internal server error" }
                        }
                    }
                },
                "/api/shadow-apis": {
                    post: {
                        summary: "Detect shadow APIs",
                        description: "Scan code for undocumented API endpoints and security risks",
                        operationId: "detectShadowAPIs",
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            content: {
                                                type: "string",
                                                description: "Code content to analyze"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            "200": {
                                description: "Shadow API scan completed",
                                content: {
                                    "application/json": {
                                        schema: { $ref: "#/components/schemas/ShadowAPIResult" }
                                    }
                                }
                            },
                            "400": { description: "Invalid input" },
                            "401": { description: "Unauthorized" },
                            "429": { description: "Rate limit exceeded" },
                            "500": { description: "Internal server error" }
                        }
                    }
                }
            },
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "x-api-key"
                    }
                },
                schemas: {
                    ScanResult: {
                        type: "object",
                        properties: {
                            content: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["text"] },
                                        text: { type: "string" }
                                    }
                                }
                            },
                            isError: { type: "boolean" }
                        }
                    },
                    GraphResult: {
                        type: "object",
                        properties: {
                            content: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["text"] },
                                        text: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    ShadowAPIResult: {
                        type: "object",
                        properties: {
                            content: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["text"] },
                                        text: { type: "string" }
                                    }
                                }
                            },
                            isError: { type: "boolean" }
                        }
                    }
                }
            }
        };

        return new NextResponse(JSON.stringify(openapiSpec, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key, authorization'
            }
        });

    } catch (error) {
        console.error('[API Error]', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}