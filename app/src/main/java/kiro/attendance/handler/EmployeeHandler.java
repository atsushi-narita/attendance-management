package kiro.attendance.handler;

import java.sql.Connection;
import java.util.List;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.CognitoAuthService;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.dao.impl.EmployeeDaoImpl;
import kiro.attendance.entity.Employee;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;
import kiro.attendance.service.EmployeeService;
import kiro.attendance.util.DatabaseConnectionUtil;
import kiro.attendance.util.ResponseUtil;

/**
 * 従業員管理Lambda関数ハンドラー
 */
public class EmployeeHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CognitoAuthService authService =
            new CognitoAuthService(System.getenv("COGNITO_USER_POOL_ID"),
                    System.getenv("COGNITO_CLIENT_ID"), System.getenv("AWS_REGION"));

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input,
            Context context) {
        try {
            // 認証チェック
            AuthenticatedUser user = authService.authenticate(input);
            if (user == null) {
                return ResponseUtil.createErrorResponse(ErrorCode.UNAUTHORIZED);
            }

            // 管理者権限チェック
            if (!user.hasRole(UserRole.ADMIN)) {
                return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "システム管理者権限が必要です");
            }

            // HTTPメソッドとパスによる処理分岐
            String httpMethod = input.getHttpMethod();
            String path = input.getPath();
            Map<String, String> pathParameters = input.getPathParameters();

            try (Connection connection = DatabaseConnectionUtil.getConnection()) {
                EmployeeDao employeeDao = new EmployeeDaoImpl(connection);
                EmployeeService employeeService = new EmployeeService(employeeDao);

                switch (httpMethod) {
                    case "GET":
                        if (path.equals("/api/employees")) {
                            return handleGetAllEmployees(employeeService);
                        } else if (path.matches("/api/employees/\\d+$")) {
                            Long employeeId = Long.parseLong(pathParameters.get("id"));
                            return handleGetEmployee(employeeService, employeeId);
                        }
                        break;
                    case "POST":
                        if (path.equals("/api/employees")) {
                            return handleCreateEmployee(employeeService, input.getBody());
                        }
                        break;
                    case "PUT":
                        if (path.matches("/api/employees/\\d+$")) {
                            Long employeeId = Long.parseLong(pathParameters.get("id"));
                            return handleUpdateEmployee(employeeService, employeeId,
                                    input.getBody());
                        }
                        break;
                    case "DELETE":
                        if (path.matches("/api/employees/\\d+$")) {
                            Long employeeId = Long.parseLong(pathParameters.get("id"));
                            return handleDeleteEmployee(employeeService, employeeId);
                        }
                        break;
                }

                return ResponseUtil.createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR,
                        "不正なリクエストです");
            }

        } catch (AttendanceException e) {
            context.getLogger().log("AttendanceException: " + e.getMessage());
            return ResponseUtil.createErrorResponse(e.getErrorCode(), e.getMessage());
        } catch (Exception e) {
            context.getLogger().log("Unexpected error: " + e.getMessage());
            return ResponseUtil.createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR,
                    "予期しないエラーが発生しました");
        }
    }

    /**
     * 従業員一覧取得処理
     */
    private APIGatewayProxyResponseEvent handleGetAllEmployees(EmployeeService employeeService) {
        try {
            List<Employee> employees = employeeService.getAllEmployees();
            return ResponseUtil.createSuccessResponse(employees);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員一覧の取得に失敗しました", e);
        }
    }

    /**
     * 従業員取得処理
     */
    private APIGatewayProxyResponseEvent handleGetEmployee(EmployeeService employeeService,
            Long employeeId) {
        try {
            Employee employee = employeeService.getEmployee(employeeId);
            return ResponseUtil.createSuccessResponse(employee);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員の取得に失敗しました", e);
        }
    }

    /**
     * 従業員登録処理
     */
    private APIGatewayProxyResponseEvent handleCreateEmployee(EmployeeService employeeService,
            String requestBody) {
        try {
            EmployeeService.EmployeeCreateRequest request = objectMapper.readValue(requestBody,
                    EmployeeService.EmployeeCreateRequest.class);
            Employee employee = employeeService.createEmployee(request);
            return ResponseUtil.createSuccessResponse(employee);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員の登録に失敗しました", e);
        }
    }

    /**
     * 従業員更新処理
     */
    private APIGatewayProxyResponseEvent handleUpdateEmployee(EmployeeService employeeService,
            Long employeeId, String requestBody) {
        try {
            EmployeeService.EmployeeUpdateRequest request = objectMapper.readValue(requestBody,
                    EmployeeService.EmployeeUpdateRequest.class);
            Employee employee = employeeService.updateEmployee(employeeId, request);
            return ResponseUtil.createSuccessResponse(employee);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員の更新に失敗しました", e);
        }
    }

    /**
     * 従業員削除処理
     */
    private APIGatewayProxyResponseEvent handleDeleteEmployee(EmployeeService employeeService,
            Long employeeId) {
        try {
            employeeService.deleteEmployee(employeeId);
            return ResponseUtil.createSuccessResponse(Map.of("message", "従業員を削除しました"));
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員の削除に失敗しました", e);
        }
    }
}
