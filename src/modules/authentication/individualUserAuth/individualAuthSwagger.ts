export const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Individual User API",
      version: "1.0.0",
      description: "API for managing individual user accounts",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],
    components: {
      schemas: {
        IndividualUserAuthSignUp: {
          type: "object",
          required: ["email", "password", "phoneNumber", "confirmPassword"],
          properties: {
            email: {
              type: "string",
              format: "email",
              deault: "example@example.com",
              description: "User's email addess",
            },
            phoneNumber: {
              type: "string",
              format: "phoneNumber",
              description: "User's phone number",
              default: "+11234567890",
            },
            password: {
              type: "string",
              format: "password",
              description: "User's password",
              default: "examplePassword",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              description: "confirm password",
              default: "examplePassword",
            },
          },
        },
        IndividualUserAuthLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              default: "example@gmail.com",
              description: "User's email address",
            },
            password: {
              type: "string",
              format: "password",
              default: "examplePassword",
              description: "User's password",
            },
          },
        },
        IndividualUserAuthForgotPassword: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              default: "example@gmail.com",
              description: "User's email address",
            },
          },
        },
        IndividualUserAuthResetPassword: {
          type: "object",
          required: ["password", "confirmPassword"],
          properties: {
            password: {
              type: "string",
              format: "password",
              default: "examplePassword",
              description: "User's password",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              default: "examplePassword",
              description: "confirm password",
            },
          },
        },
        IndividualUserAuthVerifyEmail: {
          type: "object",
          required: ["verificationToken"],
          properties: {
            verificationToken: {
              type: "string",
              default: "exampleToken",
              description: "User's verification token",
            },
          },
        },
        IndividualUserRefreshAccessToken: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              default: "example",
            },
          },
        },
      },

      responses: {
        200: {
          description: "success",
          content: "application/json",
        },
        400: {
          description: "Bad Request",
          content: "application/json",
        },
        404: {
          description: "Request Not Found",
          content: "application/json",
        },
        403: {
          description: "Unauthorized Request",
          content: "application/json",
        },
        500: {
          description: "Internal server error",
          content: "application/json",
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: "apikey",
          in: "header",
          name: "Authorization",
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: [
    "./src/modules/authentication/individualUserAuth/individualAuth.route.ts",
  ],
};

// export { options };
