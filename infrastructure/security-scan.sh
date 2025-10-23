#!/bin/bash

# Security Scan Script for Attendance Management System
# Performs comprehensive security checks before production deployment

set -e

echo "🔒 Starting Security Verification for Attendance Management System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ((PASSED_CHECKS++))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ((FAILED_CHECKS++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ((WARNING_CHECKS++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
    ((TOTAL_CHECKS++))
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Infrastructure Security Checks
echo -e "\n${BLUE}1. Infrastructure Security Checks${NC}"
echo "-----------------------------------"

# Check CloudFormation templates for security issues
if [ -d "cloudformation" ]; then
    print_status "INFO" "Scanning CloudFormation templates..."
    
    # Check for hardcoded secrets
    if grep -r "password\|secret\|key" cloudformation/ --include="*.yml" --include="*.yaml" | grep -v "Ref\|GetAtt\|Parameter" > /dev/null; then
        print_status "FAIL" "Potential hardcoded secrets found in CloudFormation templates"
    else
        print_status "PASS" "No hardcoded secrets found in CloudFormation templates"
    fi
    
    # Check for public S3 buckets
    if grep -r "PublicRead\|PublicReadWrite" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
        print_status "WARN" "Public S3 bucket access detected - verify if intentional"
    else
        print_status "PASS" "No public S3 bucket access found"
    fi
    
    # Check for open security groups
    if grep -r "0.0.0.0/0" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
        print_status "WARN" "Open security group rules detected - verify if necessary"
    else
        print_status "PASS" "No overly permissive security group rules found"
    fi
else
    print_status "WARN" "CloudFormation directory not found"
fi

# 2. Application Security Checks
echo -e "\n${BLUE}2. Application Security Checks${NC}"
echo "--------------------------------"

# Check Java application for security issues
if [ -d "../app" ]; then
    print_status "INFO" "Scanning Java application..."
    
    # Check for SQL injection vulnerabilities (basic check)
    if find ../app -name "*.java" -exec grep -l "Statement.*execute.*+" {} \; | head -1 > /dev/null; then
        print_status "WARN" "Potential SQL injection vulnerability - verify parameterized queries are used"
    else
        print_status "PASS" "No obvious SQL injection patterns found"
    fi
    
    # Check for hardcoded credentials
    if find ../app -name "*.java" -exec grep -l "password\|secret\|key.*=" {} \; | head -1 > /dev/null; then
        print_status "FAIL" "Potential hardcoded credentials found in Java code"
    else
        print_status "PASS" "No hardcoded credentials found in Java code"
    fi
    
    # Check for proper input validation
    if find ../app -name "*.java" -exec grep -l "@Valid\|@NotNull\|@Size" {} \; | head -1 > /dev/null; then
        print_status "PASS" "Input validation annotations found"
    else
        print_status "WARN" "Consider adding input validation annotations"
    fi
else
    print_status "WARN" "Java application directory not found"
fi

# Check frontend for security issues
if [ -d "../frontend" ]; then
    print_status "INFO" "Scanning frontend application..."
    
    # Check for sensitive data in frontend
    if find ../frontend -name "*.vue" -o -name "*.js" -o -name "*.ts" | xargs grep -l "password\|secret\|key.*=" | head -1 > /dev/null; then
        print_status "FAIL" "Potential sensitive data found in frontend code"
    else
        print_status "PASS" "No sensitive data found in frontend code"
    fi
    
    # Check for XSS vulnerabilities (basic check)
    if find ../frontend -name "*.vue" | xargs grep -l "v-html\|innerHTML" | head -1 > /dev/null; then
        print_status "WARN" "Potential XSS vulnerability - verify HTML sanitization"
    else
        print_status "PASS" "No obvious XSS patterns found"
    fi
    
    # Check for HTTPS enforcement
    if find ../frontend -name "*.js" -o -name "*.ts" | xargs grep -l "https://" | head -1 > /dev/null; then
        print_status "PASS" "HTTPS usage found in frontend"
    else
        print_status "WARN" "Verify HTTPS is enforced in production"
    fi
else
    print_status "WARN" "Frontend directory not found"
fi

# 3. Dependency Security Checks
echo -e "\n${BLUE}3. Dependency Security Checks${NC}"
echo "-------------------------------"

# Check Node.js dependencies
if [ -f "../frontend/package.json" ]; then
    print_status "INFO" "Checking Node.js dependencies..."
    
    cd ../frontend
    
    if command_exists npm; then
        if npm audit --audit-level=high > /dev/null 2>&1; then
            print_status "PASS" "No high-severity vulnerabilities in Node.js dependencies"
        else
            print_status "FAIL" "High-severity vulnerabilities found in Node.js dependencies"
            echo "Run 'npm audit' for details"
        fi
    else
        print_status "WARN" "npm not available - cannot check Node.js dependencies"
    fi
    
    cd - > /dev/null
else
    print_status "WARN" "package.json not found"
fi

# Check Java dependencies (if using Maven or Gradle)
if [ -f "../app/build.gradle" ]; then
    print_status "INFO" "Checking Java dependencies..."
    
    cd ../app
    
    if command_exists ./gradlew; then
        # Check for known vulnerable dependencies
        if ./gradlew dependencyCheckAnalyze > /dev/null 2>&1; then
            print_status "PASS" "Dependency security check completed"
        else
            print_status "WARN" "Could not run dependency security check - consider adding OWASP dependency check plugin"
        fi
    else
        print_status "WARN" "Gradle wrapper not found"
    fi
    
    cd - > /dev/null
fi

# 4. Configuration Security Checks
echo -e "\n${BLUE}4. Configuration Security Checks${NC}"
echo "----------------------------------"

# Check for secure headers configuration
print_status "INFO" "Checking security headers configuration..."

# Check if security headers are configured in CloudFront
if grep -r "ResponseHeadersPolicy\|SecurityHeadersConfig" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "Security headers configuration found"
else
    print_status "WARN" "Consider adding security headers (HSTS, CSP, X-Frame-Options, etc.)"
fi

# Check for CORS configuration
if grep -r "CORS\|Access-Control" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "CORS configuration found"
else
    print_status "WARN" "Verify CORS configuration is properly set"
fi

# 5. Authentication and Authorization Checks
echo -e "\n${BLUE}5. Authentication and Authorization Checks${NC}"
echo "--------------------------------------------"

# Check Cognito configuration
if grep -r "Cognito" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "Cognito authentication configuration found"
    
    # Check for MFA configuration
    if grep -r "MfaConfiguration\|EnableSoftwareTokenMFA" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
        print_status "PASS" "MFA configuration found"
    else
        print_status "WARN" "Consider enabling MFA for enhanced security"
    fi
    
    # Check password policy
    if grep -r "PasswordPolicy" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
        print_status "PASS" "Password policy configuration found"
    else
        print_status "WARN" "Consider configuring strong password policy"
    fi
else
    print_status "WARN" "Cognito configuration not found"
fi

# 6. Data Protection Checks
echo -e "\n${BLUE}6. Data Protection Checks${NC}"
echo "---------------------------"

# Check for encryption at rest
if grep -r "Encrypted.*true\|KmsKeyId" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "Encryption at rest configuration found"
else
    print_status "WARN" "Verify encryption at rest is enabled for sensitive data"
fi

# Check for encryption in transit
if grep -r "TLS\|SSL\|HTTPS" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "Encryption in transit configuration found"
else
    print_status "WARN" "Verify encryption in transit is enforced"
fi

# 7. Logging and Monitoring Checks
echo -e "\n${BLUE}7. Logging and Monitoring Checks${NC}"
echo "----------------------------------"

# Check for CloudTrail
if grep -r "CloudTrail" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "CloudTrail logging configuration found"
else
    print_status "WARN" "Consider enabling CloudTrail for audit logging"
fi

# Check for CloudWatch monitoring
if grep -r "CloudWatch\|Alarm" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "CloudWatch monitoring configuration found"
else
    print_status "WARN" "Consider adding CloudWatch alarms for security monitoring"
fi

# 8. Network Security Checks
echo -e "\n${BLUE}8. Network Security Checks${NC}"
echo "----------------------------"

# Check for VPC configuration
if grep -r "VPC\|Subnet" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "VPC network isolation configuration found"
else
    print_status "WARN" "Consider using VPC for network isolation"
fi

# Check for WAF configuration
if grep -r "WAF\|WebACL" cloudformation/ --include="*.yml" --include="*.yaml" > /dev/null; then
    print_status "PASS" "WAF configuration found"
else
    print_status "WARN" "Consider adding WAF for application protection"
fi

# Summary
echo -e "\n${BLUE}Security Scan Summary${NC}"
echo "====================="
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"

# Calculate score
SCORE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
echo "Security Score: $SCORE%"

# Recommendations
echo -e "\n${BLUE}Security Recommendations${NC}"
echo "============================"
echo "1. Enable MFA for all user accounts"
echo "2. Implement strong password policies"
echo "3. Use least privilege access principles"
echo "4. Enable encryption for all data at rest and in transit"
echo "5. Implement comprehensive logging and monitoring"
echo "6. Regular security updates and patches"
echo "7. Conduct regular security assessments"
echo "8. Implement WAF rules for common attacks"
echo "9. Use security headers to prevent common web vulnerabilities"
echo "10. Regular backup and disaster recovery testing"

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "\n${RED}❌ Security scan completed with failures. Address critical issues before production deployment.${NC}"
    exit 1
elif [ $WARNING_CHECKS -gt 5 ]; then
    echo -e "\n${YELLOW}⚠️  Security scan completed with warnings. Consider addressing warnings before production deployment.${NC}"
    exit 2
else
    echo -e "\n${GREEN}✅ Security scan completed successfully. System is ready for production deployment.${NC}"
    exit 0
fi