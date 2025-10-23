package kiro.attendance.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.AuthenticationException;
import kiro.attendance.auth.CognitoAuthService;

@ExtendWith(MockitoExtension.class)
class AuthHandlerTest {

    @Mock
    private CognitoAuthService authService;

    @Mock
    private Context context;

    @Mock
    private LambdaLogger logger;

    private AuthHandler authHandler;
    private ObjectMapper objectMapper;
    private AuthenticatedUser testUser;

    @BeforeEach
    void setUp() {
        authHandler = new AuthHandler(authService);
        objectMapper = new ObjectMapper();
        testUser = new AuthenticatedUser("user-123", "test@example.com", "EMP001", "EMPLOYEE",
                List.of("employees"));

        lenient().when(context.getLogger()).thenReturn(logger);
    }

    @Test
    void testValidateToken_Success() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("POST");
        request.setPath("/api/auth/validate");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer valid-token");
        request.setHeaders(headers);

        when(authService.validateToken("valid-token")).thenReturn(testUser);

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        assertThat(response.getHeaders().get("Content-Type")).isEqualTo("application/json");

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("valid")).isEqualTo(true);
        assertThat(responseBody).containsKey("user");
    }

    @Test
    void testValidateToken_InvalidToken() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("POST");
        request.setPath("/api/auth/validate");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer invalid-token");
        request.setHeaders(headers);

        when(authService.validateToken("invalid-token"))
                .thenThrow(new AuthenticationException("Invalid token"));

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(401);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("valid")).isEqualTo(false);
        assertThat(responseBody.get("error")).isEqualTo("Invalid token");
    }

    @Test
    void testValidateToken_MissingAuthHeader() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("POST");
        request.setPath("/api/auth/validate");
        request.setHeaders(new HashMap<>());

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(401);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("error")).isEqualTo("Missing or invalid Authorization header");
    }

    @Test
    void testGetCurrentUser_Success() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("GET");
        request.setPath("/api/auth/user");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer valid-token");
        request.setHeaders(headers);

        when(authService.validateToken("valid-token")).thenReturn(testUser);

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody).containsKey("userId");
        assertThat(responseBody).containsKey("email");
    }

    @Test
    void testGetUserPermissions_Success() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("GET");
        request.setPath("/api/auth/permissions");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer valid-token");
        request.setHeaders(headers);

        when(authService.validateToken("valid-token")).thenReturn(testUser);
        when(authService.hasPermission(testUser, "ATTENDANCE_MANAGE")).thenReturn(true);
        when(authService.hasPermission(testUser, "EMPLOYEE_MANAGE")).thenReturn(false);
        when(authService.hasPermission(testUser, "CORRECTION_APPROVE")).thenReturn(false);
        when(authService.hasPermission(testUser, "RECORDS_VIEW_ALL")).thenReturn(false);

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("userId")).isEqualTo("user-123");
        assertThat(responseBody).containsKey("permissions");
        assertThat(responseBody).containsKey("groups");

        Map<String, Boolean> permissions = (Map<String, Boolean>) responseBody.get("permissions");
        assertThat(permissions.get("ATTENDANCE_MANAGE")).isTrue();
        assertThat(permissions.get("EMPLOYEE_MANAGE")).isFalse();
    }

    @Test
    void testAddUserToGroup_Success() throws Exception {
        // Given
        AuthenticatedUser adminUser = new AuthenticatedUser("admin-123", "admin@example.com",
                "ADM001", "ADMIN", List.of("admins"));

        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("POST");
        request.setPath("/api/auth/user-groups");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer admin-token");
        request.setHeaders(headers);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("username", "test-user");
        requestBody.put("groupName", "employees");
        request.setBody(objectMapper.writeValueAsString(requestBody));

        when(authService.validateToken("admin-token")).thenReturn(adminUser);
        doNothing().when(authService).addUserToGroup("test-user", "employees");

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("success")).isEqualTo(true);
        assertThat(responseBody.get("message")).isEqualTo("User added to group successfully");

        verify(authService).addUserToGroup("test-user", "employees");
    }

    @Test
    void testAddUserToGroup_Forbidden() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("POST");
        request.setPath("/api/auth/user-groups");

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer employee-token");
        request.setHeaders(headers);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("username", "test-user");
        requestBody.put("groupName", "employees");
        request.setBody(objectMapper.writeValueAsString(requestBody));

        when(authService.validateToken("employee-token")).thenReturn(testUser);

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(403);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("error")).isEqualTo("Admin access required");

        verify(authService, never()).addUserToGroup(anyString(), anyString());
    }

    @Test
    void testMethodNotAllowed() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("DELETE");
        request.setPath("/api/auth/validate");

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(405);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("error")).isEqualTo("Method not allowed");
    }

    @Test
    void testNotFound() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("GET");
        request.setPath("/api/auth/nonexistent");

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(404);

        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(responseBody.get("error")).isEqualTo("Not found");
    }

    @Test
    void testCorsHeaders() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setHttpMethod("GET");
        request.setPath("/api/auth/nonexistent");

        // When
        APIGatewayProxyResponseEvent response = authHandler.handleRequest(request, context);

        // Then
        Map<String, String> headers = response.getHeaders();
        assertThat(headers.get("Access-Control-Allow-Origin")).isEqualTo("*");
        assertThat(headers.get("Access-Control-Allow-Methods"))
                .isEqualTo("GET, POST, PUT, DELETE, OPTIONS");
        assertThat(headers.get("Access-Control-Allow-Headers"))
                .isEqualTo("Content-Type, Authorization");
    }
}
