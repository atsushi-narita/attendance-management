package com.attendance.handler;

import java.util.HashMap;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.attendance.util.CacheManager;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Base class for optimized Lambda handlers Implements common performance optimizations
 */
public abstract class OptimizedLambdaHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    // Static initialization for Lambda container reuse
    protected static final ObjectMapper objectMapper = new ObjectMapper();
    protected static final CacheManager cache = CacheManager.getInstance();
    protected static final Map<String, String> defaultHeaders = new HashMap<>();

    static {
        // Pre-configure default headers
        defaultHeaders.put("Content-Type", "application/json");
        defaultHeaders.put("Access-Control-Allow-Origin", "*");
        defaultHeaders.put("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        defaultHeaders.put("Access-Control-Allow-Headers", "Content-Type, Authorization");

        // Configure ObjectMapper for performance
        objectMapper.findAndRegisterModules();
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input,
            Context context) {
        long startTime = System.currentTimeMillis();

        try {
            // Handle CORS preflight requests quickly
            if ("OPTIONS".equals(input.getHttpMethod())) {
                return createResponse(200, null);
            }

            // Process the actual request
            APIGatewayProxyResponseEvent response = processRequest(input, context);

            // Add performance headers
            response.getHeaders().put("X-Response-Time",
                    String.valueOf(System.currentTimeMillis() - startTime));

            return response;

        } catch (Exception e) {
            context.getLogger().log("Error processing request: " + e.getMessage());
            return createErrorResponse(500, "Internal Server Error", e.getMessage());
        }
    }

    /**
     * Abstract method for subclasses to implement request processing
     */
    protected abstract APIGatewayProxyResponseEvent processRequest(
            APIGatewayProxyRequestEvent input, Context context) throws Exception;

    /**
     * Create standardized success response
     */
    protected APIGatewayProxyResponseEvent createResponse(int statusCode, Object body) {
        APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
        response.setStatusCode(statusCode);
        response.setHeaders(new HashMap<>(defaultHeaders));

        if (body != null) {
            try {
                response.setBody(objectMapper.writeValueAsString(body));
            } catch (Exception e) {
                return createErrorResponse(500, "Serialization Error", e.getMessage());
            }
        }

        return response;
    }

    /**
     * Create standardized error response
     */
    protected APIGatewayProxyResponseEvent createErrorResponse(int statusCode, String error,
            String message) {
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("error", error);
        errorBody.put("message", message);
        errorBody.put("timestamp", System.currentTimeMillis());

        return createResponse(statusCode, errorBody);
    }

    /**
     * Parse JSON request body
     */
    protected <T> T parseRequestBody(String body, Class<T> clazz) throws Exception {
        if (body == null || body.trim().isEmpty()) {
            return null;
        }
        return objectMapper.readValue(body, clazz);
    }

    /**
     * Get path parameter with validation
     */
    protected String getPathParameter(APIGatewayProxyRequestEvent input, String paramName) {
        Map<String, String> pathParams = input.getPathParameters();
        if (pathParams == null) {
            return null;
        }
        return pathParams.get(paramName);
    }

    /**
     * Get query parameter with validation
     */
    protected String getQueryParameter(APIGatewayProxyRequestEvent input, String paramName) {
        Map<String, String> queryParams = input.getQueryStringParameters();
        if (queryParams == null) {
            return null;
        }
        return queryParams.get(paramName);
    }

    /**
     * Get query parameter with default value
     */
    protected String getQueryParameter(APIGatewayProxyRequestEvent input, String paramName,
            String defaultValue) {
        String value = getQueryParameter(input, paramName);
        return value != null ? value : defaultValue;
    }

    /**
     * Get integer query parameter with validation
     */
    protected Integer getIntQueryParameter(APIGatewayProxyRequestEvent input, String paramName,
            Integer defaultValue) {
        String value = getQueryParameter(input, paramName);
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * Extract user ID from JWT token (simplified)
     */
    protected String getUserId(APIGatewayProxyRequestEvent input) {
        Map<String, Object> requestContext = input.getRequestContext();
        if (requestContext != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> authorizer = (Map<String, Object>) requestContext.get("authorizer");
            if (authorizer != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
                if (claims != null) {
                    return (String) claims.get("sub");
                }
            }
        }
        return null;
    }

    /**
     * Check if user has required role
     */
    protected boolean hasRole(APIGatewayProxyRequestEvent input, String requiredRole) {
        Map<String, Object> requestContext = input.getRequestContext();
        if (requestContext != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> authorizer = (Map<String, Object>) requestContext.get("authorizer");
            if (authorizer != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
                if (claims != null) {
                    String groups = (String) claims.get("cognito:groups");
                    return groups != null && groups.contains(requiredRole);
                }
            }
        }
        return false;
    }
}
