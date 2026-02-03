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
        ],
        paths: {
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'User Login',
                    description: 'Authenticate user and get JWT token',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email', example: 'admin@hospital-his.com' },
                                        password: { type: 'string', example: 'Admin@123' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean', example: true },
                                            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                            refreshToken: { type: 'string' },
                                            user: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    username: { type: 'string' },
                                                    email: { type: 'string' },
                                                    role: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        401: { description: 'Invalid credentials' }
                    }
                }
            },
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get Current User',
                    description: 'Get the currently authenticated user profile',
                    responses: {
                        200: { description: 'User profile retrieved successfully' },
                        401: { description: 'Not authenticated' }
                    }
                }
            },
            '/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'User Logout',
                    description: 'Logout the current user',
                    responses: {
                        200: { description: 'Logout successful' }
                    }
                }
            },
            '/patients': {
                get: {
                    tags: ['Patients'],
                    summary: 'Get All Patients',
                    description: 'Retrieve all patients with pagination',
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                        { name: 'search', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        200: { description: 'List of patients' }
                    }
                },
                post: {
                    tags: ['Patients'],
                    summary: 'Register New Patient',
                    description: 'Create a new patient record',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Patient' }
                            }
                        }
                    },
                    responses: {
                        201: { description: 'Patient created successfully' },
                        400: { description: 'Validation error' }
                    }
                }
            },
            '/patients/{id}': {
                get: {
                    tags: ['Patients'],
                    summary: 'Get Patient by ID',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        200: { description: 'Patient details' },
                        404: { description: 'Patient not found' }
                    }
                },
                put: {
                    tags: ['Patients'],
                    summary: 'Update Patient',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Patient' }
                            }
                        }
                    },
                    responses: {
                        200: { description: 'Patient updated' }
                    }
                }
            },
            '/patients/search': {
                get: {
                    tags: ['Patients'],
                    summary: 'Search Patients',
                    parameters: [
                        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' }
                    ],
                    responses: {
                        200: { description: 'Search results' }
                    }
                }
            },
            '/opd/appointments': {
                get: {
                    tags: ['OPD'],
                    summary: 'Get Appointments',
                    parameters: [
                        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'doctorId', in: 'query', schema: { type: 'string' } },
                        { name: 'status', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'List of appointments' } }
                },
                post: {
                    tags: ['OPD'],
                    summary: 'Create Appointment',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        patientId: { type: 'string' },
                                        doctorId: { type: 'string' },
                                        departmentId: { type: 'string' },
                                        appointmentDate: { type: 'string', format: 'date-time' },
                                        type: { type: 'string', enum: ['new', 'followup'] }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 201: { description: 'Appointment created' } }
                }
            },
            '/ipd/admissions': {
                get: {
                    tags: ['IPD'],
                    summary: 'Get Admissions',
                    responses: { 200: { description: 'List of admissions' } }
                },
                post: {
                    tags: ['IPD'],
                    summary: 'Create Admission',
                    responses: { 201: { description: 'Admission created' } }
                }
            },
            '/beds': {
                get: {
                    tags: ['IPD'],
                    summary: 'Get All Beds',
                    responses: { 200: { description: 'List of beds with availability' } }
                }
            },
            '/emergency': {
                get: {
                    tags: ['Emergency'],
                    summary: 'Get Emergency Cases',
                    responses: { 200: { description: 'List of emergency cases' } }
                },
                post: {
                    tags: ['Emergency'],
                    summary: 'Register Emergency Case',
                    responses: { 201: { description: 'Emergency case registered' } }
                }
            },
            '/lab': {
                get: {
                    tags: ['Lab'],
                    summary: 'Get Lab Tests',
                    responses: { 200: { description: 'List of lab tests' } }
                }
            },
            '/lab/orders': {
                get: {
                    tags: ['Lab'],
                    summary: 'Get Lab Orders',
                    responses: { 200: { description: 'List of lab orders' } }
                },
                post: {
                    tags: ['Lab'],
                    summary: 'Create Lab Order',
                    responses: { 201: { description: 'Lab order created' } }
                }
            },
            '/pharmacy/queue': {
                get: {
                    tags: ['Pharmacy'],
                    summary: 'Get Pharmacy Queue',
                    responses: { 200: { description: 'Prescription queue' } }
                }
            },
            '/pharmacy/dispense': {
                post: {
                    tags: ['Pharmacy'],
                    summary: 'Dispense Medicine',
                    responses: { 200: { description: 'Medicine dispensed' } }
                }
            },
            '/billing': {
                get: {
                    tags: ['Billing'],
                    summary: 'Get Bills',
                    responses: { 200: { description: 'List of bills' } }
                }
            },
            '/billing/{id}': {
                get: {
                    tags: ['Billing'],
                    summary: 'Get Bill by ID',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'Bill details' } }
                }
            },
            '/staff': {
                get: {
                    tags: ['Staff'],
                    summary: 'Get Staff Members',
                    responses: { 200: { description: 'List of staff' } }
                }
            },
            '/departments': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get Departments',
                    responses: { 200: { description: 'List of departments' } }
                }
            }
        }
    },
    apis: [
        './routes/*.js',
        './server.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
