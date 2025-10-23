package kiro.attendance.auth;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.interfaces.RSAPublicKey;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminAddUserToGroupRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminRemoveUserFromGroupRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminUpdateUserAttributesRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;

/**
 * AWS Cognito認証サービス JWT トークンの検証とユーザー権限チェックを提供
 */
public class CognitoAuthService {

    private final CognitoIdentityProviderClient cognitoClient;
    private final String userPoolId;
    private final String clientId;
    private final String region;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private Map<String, RSAPublicKey> jwksKeys;

    public CognitoAuthService(String userPoolId, String clientId, String region) {
        this.userPoolId = userPoolId;
        this.clientId = clientId;
        this.region = region;
        this.cognitoClient = CognitoIdentityProviderClient.builder()
                .region(software.amazon.awssdk.regions.Region.of(region)).build();
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newHttpClient();
        this.jwksKeys = new HashMap<>();

        // JWKS キーを初期化時に取得
        loadJwksKeys();
    }

    /**
     * API Gateway リクエストから認証情報を取得
     */
    public AuthenticatedUser authenticate(
            com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent request) {
        try {
            Map<String, String> headers = request.getHeaders();
            if (headers == null) {
                return null;
            }

            String authHeader = headers.get("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return null;
            }

            String token = authHeader.substring(7);
            return validateToken(token);
        } catch (AuthenticationException e) {
            return null;
        }
    }

    /**
     * JWT トークンを検証し、ユーザー情報を取得
     */
    public AuthenticatedUser validateToken(String token) throws AuthenticationException {
        try {
            // JWTをデコード
            DecodedJWT decodedJWT = JWT.decode(token);

            // キーIDを取得
            String keyId = decodedJWT.getKeyId();
            if (keyId == null || !jwksKeys.containsKey(keyId)) {
                throw new AuthenticationException("Invalid key ID in JWT token");
            }

            // 署名を検証
            RSAPublicKey publicKey = jwksKeys.get(keyId);
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT
                    .require(algorithm).withIssuer(String
                            .format("https://cognito-idp.%s.amazonaws.com/%s", region, userPoolId))
                    .withAudience(clientId).build();

            DecodedJWT verifiedJWT = verifier.verify(token);

            // ユーザー情報を構築
            String userId = verifiedJWT.getSubject();
            String email = verifiedJWT.getClaim("email").asString();
            String employeeNumber = verifiedJWT.getClaim("custom:employee_number").asString();
            String role = verifiedJWT.getClaim("custom:role").asString();

            // Cognito グループを取得
            List<String> groups = Optional.ofNullable(verifiedJWT.getClaim("cognito:groups"))
                    .map(claim -> claim.asList(String.class)).orElse(Collections.emptyList());

            return new AuthenticatedUser(userId, email, employeeNumber, role, groups);

        } catch (JWTVerificationException e) {
            throw new AuthenticationException("Invalid JWT token: " + e.getMessage(), e);
        }
    }

    /**
     * ユーザーが指定された権限を持っているかチェック
     */
    public boolean hasPermission(AuthenticatedUser user, String permission) {
        return switch (permission) {
            case "ATTENDANCE_MANAGE" -> user.getGroups().contains("employees")
                    || user.getGroups().contains("managers") || user.getGroups().contains("admins");
            case "EMPLOYEE_MANAGE" -> user.getGroups().contains("admins");
            case "CORRECTION_APPROVE" -> user.getGroups().contains("managers")
                    || user.getGroups().contains("admins");
            case "RECORDS_VIEW_ALL" -> user.getGroups().contains("managers")
                    || user.getGroups().contains("admins");
            default -> false;
        };
    }

    /**
     * ユーザーをCognitoグループに追加
     */
    public void addUserToGroup(String username, String groupName) throws AuthenticationException {
        try {
            AdminAddUserToGroupRequest request = AdminAddUserToGroupRequest.builder()
                    .userPoolId(userPoolId).username(username).groupName(groupName).build();

            cognitoClient.adminAddUserToGroup(request);
        } catch (Exception e) {
            throw new AuthenticationException("Failed to add user to group: " + e.getMessage(), e);
        }
    }

    /**
     * ユーザーをCognitoグループから削除
     */
    public void removeUserFromGroup(String username, String groupName)
            throws AuthenticationException {
        try {
            AdminRemoveUserFromGroupRequest request = AdminRemoveUserFromGroupRequest.builder()
                    .userPoolId(userPoolId).username(username).groupName(groupName).build();

            cognitoClient.adminRemoveUserFromGroup(request);
        } catch (Exception e) {
            throw new AuthenticationException("Failed to remove user from group: " + e.getMessage(),
                    e);
        }
    }

    /**
     * ユーザーのカスタム属性を更新
     */
    public void updateUserAttributes(String username, Map<String, String> attributes)
            throws AuthenticationException {
        try {
            List<AttributeType> userAttributes =
                    attributes.entrySet().stream().map(entry -> AttributeType.builder()
                            .name(entry.getKey()).value(entry.getValue()).build()).toList();

            AdminUpdateUserAttributesRequest request =
                    AdminUpdateUserAttributesRequest.builder().userPoolId(userPoolId)
                            .username(username).userAttributes(userAttributes).build();

            cognitoClient.adminUpdateUserAttributes(request);
        } catch (Exception e) {
            throw new AuthenticationException("Failed to update user attributes: " + e.getMessage(),
                    e);
        }
    }

    /**
     * JWKS キーを取得してキャッシュ
     */
    private void loadJwksKeys() {
        try {
            String jwksUrl =
                    String.format("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
                            region, userPoolId);

            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(jwksUrl)).GET().build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode jwks = objectMapper.readTree(response.body());
                JsonNode keys = jwks.get("keys");

                for (JsonNode key : keys) {
                    String keyId = key.get("kid").asText();
                    // RSA公開鍵の構築は簡略化（実際の実装では適切なライブラリを使用）
                    // この部分は本格的な実装では java-jwt ライブラリの RSA キー処理を使用
                    jwksKeys.put(keyId, null); // プレースホルダー
                }
            }
        } catch (IOException | InterruptedException e) {
            System.err.println("Failed to load JWKS keys: " + e.getMessage());
        }
    }
}
