package kiro.attendance.handler;

import java.util.HashMap;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.AuthenticationException;
import kiro.attendance.auth.CognitoAuthService;

/**
 * 認証関連のLambda関数ハンドラー
 */
public class AuthHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private final CognitoAuthService authService;
    private final ObjectMapper objectMapper;

    public AuthHandler() {
        String userPoolId = System.getenv("COGNITO_USER_POOL_ID");
        String clientId = System.getenv("COGNITO_CLIENT_ID");
        String region = System.getenv("AWS_REGION");

        this.authService = new CognitoAuthService(userPoolId, clientId, region);
        this.objectMapper = new ObjectMapper();
    }

    // テスト用コンストラクタ
    public AuthHandler(CognitoAuthService authService) {
        this.authService = authService;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input,
            Context context) {
        try {
            String httpMethod = input.getHttpMethod();
            String path = input.getPath();

            return switch (httpMethod) {
                case "POST" -> handlePostRequest(input, path);
                case "GET" -> handleGetRequest(input, path);
                case "PUT" -> handlePutRequest(input, path);
                default -> createErrorResponse(405, "Method not allowed");
            };

        } catch (Exception e) {
            context.getLogger().log("Error processing request: " + e.getMessage());
            return createErrorResponse(500, "Internal server error");
        }
    }

    private APIGatewayProxyResponseEvent handlePostRequest(APIGatewayProxyRequestEvent input,
            String path) {
        try {
            if (path.equals("/api/auth/validate")) {
                return validateToken(input);
            } else if (path.equals("/api/auth/user-groups")) {
                return addUserToGroup(input);
            }

            return createErrorResponse(404, "Not found");
        } catch (Exception e) {
            return createErrorResponse(500, "Error processing POST request: " + e.getMessage());
        }
    }

    private APIGatewayProxyResponseEvent handleGetRequest(APIGatewayProxyRequestEvent input,
            String path) {
        try {
            if (path.equals("/api/auth/user")) {
                return getCurrentUser(input);
            } else if (path.equals("/api/auth/permissions")) {
                return getUserPermissions(input);
            }

            return createErrorResponse(404, "Not found");
        } catch (Exception e) {
            return createErrorResponse(500, "Error processing GET request: " + e.getMessage());
        }
    }

    private APIGatewayProxyResponseEvent handlePutRequest(APIGatewayProxyRequestEvent input,
            String path) {
        try {
            if (path.startsWith("/api/auth/users/") && path.endsWith("/attributes")) {
                return updateUserAttributes(input);
            }

            return createErrorResponse(404, "Not found");
        } catch (Exception e) {
            return createErrorResponse(500, "Error processing PUT request: " + e.getMessage());
        }
    }

    /**
     * JWT トークンを検証してユーザー情報を返す
     */
    private APIGatewayProxyResponseEvent validateToken(APIGatewayProxyRequestEvent input) {
        try {
            String authHeader = input.getHeaders().get("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return createErrorResponse(401, "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);
            AuthenticatedUser user = authService.validateToken(token);

            Map<String, Object> response = new HashMap<>();
            response.put("valid", true);
            response.put("user", user);

            return createSuccessResponse(response);

        } catch (AuthenticationException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("error", e.getMessage());

            return createResponse(401, response);
        } catch (Exception e) {
            return createErrorResponse(500, "Token validation failed: " + e.getMessage());
        }
    }

    /**
     * 現在のユーザー情報を取得
     */
    private APIGatewayProxyResponseEvent getCurrentUser(APIGatewayProxyRequestEvent input) {
        try {
            AuthenticatedUser user = extractUserFromRequest(input);
            if (user == null) {
                return createErrorResponse(401, "Unauthorized");
            }

            return createSuccessResponse(user);

        } catch (Exception e) {
            return createErrorResponse(500, "Failed to get current user: " + e.getMessage());
        }
    }

    /**
     * ユーザーの権限情報を取得
     */
    private APIGatewayProxyResponseEvent getUserPermissions(APIGatewayProxyRequestEvent input) {
        try {
            AuthenticatedUser user = extractUserFromRequest(input);
            if (user == null) {
                return createErrorResponse(401, "Unauthorized");
            }

            Map<String, Boolean> permissions = new HashMap<>();
            permissions.put("ATTENDANCE_MANAGE",
                    authService.hasPermission(user, "ATTENDANCE_MANAGE"));
            permissions.put("EMPLOYEE_MANAGE", authService.hasPermission(user, "EMPLOYEE_MANAGE"));
            permissions.put("CORRECTION_APPROVE",
                    authService.hasPermission(user, "CORRECTION_APPROVE"));
            permissions.put("RECORDS_VIEW_ALL",
                    authService.hasPermission(user, "RECORDS_VIEW_ALL"));

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getUserId());
            response.put("permissions", permissions);
            response.put("groups", user.getGroups());

            return createSuccessResponse(response);

        } catch (Exception e) {
            return createErrorResponse(500, "Failed to get user permissions: " + e.getMessage());
        }
    }

    /**
     * ユーザーをグループに追加
     */
    private APIGatewayProxyResponseEvent addUserToGroup(APIGatewayProxyRequestEvent input) {
        try {
            AuthenticatedUser currentUser = extractUserFromRequest(input);
            if (currentUser == null || !currentUser.isAdmin()) {
                return createErrorResponse(403, "Admin access required");
            }

            Map<String, Object> requestBody = objectMapper.readValue(input.getBody(), Map.class);
            String username = (String) requestBody.get("username");
            String groupName = (String) requestBody.get("groupName");

            if (username == null || groupName == null) {
                return createErrorResponse(400, "Username and groupName are required");
            }

            authService.addUserToGroup(username, groupName);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User added to group successfully");

            return createSuccessResponse(response);

        } catch (AuthenticationException e) {
            return createErrorResponse(400, e.getMessage());
        } catch (Exception e) {
            return createErrorResponse(500, "Failed to add user to group: " + e.getMessage());
        }
    }

    /**
     * ユーザー属性を更新
     */
    private APIGatewayProxyResponseEvent updateUserAttributes(APIGatewayProxyRequestEvent input) {
        try {
            AuthenticatedUser currentUser = extractUserFromRequest(input);
            if (currentUser == null || !currentUser.isAdmin()) {
                return createErrorResponse(403, "Admin access required");
            }

            String pathParam = input.getPathParameters().get("username");
            if (pathParam == null) {
                return createErrorResponse(400, "Username path parameter is required");
            }

            Map<String, Object> requestBody = objectMapper.readValue(input.getBody(), Map.class);
            Map<String, String> attributes = (Map<String, String>) requestBody.get("attributes");

            if (attributes == null) {
                return createErrorResponse(400, "Attributes are required");
            }

            authService.updateUserAttributes(pathParam, attributes);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User attributes updated successfully");

            return createSuccessResponse(response);

        } catch (AuthenticationException e) {
            return createErrorResponse(400, e.getMessage());
        } catch (Exception e) {
            return createErrorResponse(500, "Failed to update user attributes: " + e.getMessage());
        }
    }

    /**
     * リクエストからユーザー情報を抽出
     */
    private AuthenticatedUser extractUserFromRequest(APIGatewayProxyRequestEvent input) {
        try {
            String authHeader = input.getHeaders().get("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return null;
            }

            String token = authHeader.substring(7);
            return authService.validateToken(token);

        } catch (AuthenticationException e) {
            return null;
        }
    }

    /**
     * 成功レスポンスを作成
     */
    private APIGatewayProxyResponseEvent createSuccessResponse(Object data) {
        return createResponse(200, data);
    }

    /**
     * エラーレスポンスを作成
     */
    private APIGatewayProxyResponseEvent createErrorResponse(int statusCode, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", message);
        error.put("statusCode", statusCode);

        return createResponse(statusCode, error);
    }

    /**
     * APIGatewayProxyResponseEventを作成
     */
    private APIGatewayProxyResponseEvent createResponse(int statusCode, Object body) {
        try {
            APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
            response.setStatusCode(statusCode);

            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", "application/json");
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            headers.put("Access-Control-Allow-Headers", "Content-Type, Authorization");
            response.setHeaders(headers);

            response.setBody(objectMapper.writeValueAsString(body));

            return response;
        } catch (Exception e) {
            APIGatewayProxyResponseEvent errorResponse = new APIGatewayProxyResponseEvent();
            errorResponse.setStatusCode(500);
            errorResponse.setBody("{\"error\":\"Failed to create response\"}");
            return errorResponse;
        }
    }
}
