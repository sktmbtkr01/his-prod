const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Hospital Information System (HIS) API',
            version: '1.0.0',
            description: `
## Overview
Complete REST API documentation for the Hospital Information System (HIS) backend.

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Base URL
- **Production**: https://sktmbtkr-his-prod-backend.hf.space/api/v1
- **Development**: http://localhost:5000/api/v1

## Available Modules
- **Auth**: User authentication and authorization
- **Patients**: Patient registration and management
- **OPD**: Outpatient department operations
- **IPD**: Inpatient department (admissions, beds)
- **Emergency**: Emergency department management
- **EMR**: Electronic Medical Records
- **Pharmacy**: Medicine dispensing and inventory
- **Lab**: Laboratory tests and results
- **Radiology**: Imaging and radiology services
- **Billing**: Patient billing and payments
- **Staff**: Staff management
- **Analytics**: Reports and dashboards
            `,
            contact: {
                name: 'HIS Support',
                email: 'support@his.local'
            }
        },
        servers: [
            {
                url: '/api/v1',
                description: 'API v1'
            },
            {
                url: '/api',
                description: 'Base API'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string', example: 'Error message' }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                Patient: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        patientId: { type: 'string', example: 'PT-2024-00001' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
                        gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                        phone: { type: 'string', example: '+91 9876543210' },
                        email: { type: 'string', example: 'john.doe@email.com' },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                                city: { type: 'string' },
                                state: { type: 'string' },
                                pincode: { type: 'string' }
                            }
                        }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'admin@hospital.com' },
                        password: { type: 'string', format: 'password', example: 'password123' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string' }
                            }
                        }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Patients', description: 'Patient management' },
            { name: 'OPD', description: 'Outpatient department' },
            { name: 'IPD', description: 'Inpatient department' },
            { name: 'Emergency', description: 'Emergency services' },
            { name: 'EMR', description: 'Electronic Medical Records' },
            { name: 'Pharmacy', description: 'Pharmacy and medicines' },
            { name: 'Lab', description: 'Laboratory services' },
            { name: 'Radiology', description: 'Radiology and imaging' },
            { name: 'Billing', description: 'Billing and payments' },
            { name: 'Staff', description: 'Staff management' },
            { name: 'Admin', description: 'Administrative functions' },
            { name: 'Analytics', description: 'Reports and analytics' }
        ]
    },
    apis: [
        './routes/*.js',
        './server.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
