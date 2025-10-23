#!/bin/bash

# Production Deployment Script for Attendance Management System
# Performs staged deployment with rollback capabilities

set -e

# Configuration
STACK_NAME="attendance-management"
REGION="ap-northeast-1"
ENVIRONMENT="prod"
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ SUCCESS${NC}: $message"
            ;;
        "ERROR")
            echo -e "${RED}❌ ERROR${NC}: $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING${NC}: $message"
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_status "ERROR" "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_status "ERROR" "AWS credentials not configured"
        exit 1
    fi
    
    # Check required environment variables
    if [ -z "$DB_PASSWORD" ]; then
        print_status "ERROR" "DB_PASSWORD environment variable is required"
        exit 1
    fi
    
    if [ -z "$COGNITO_DOMAIN" ]; then
        print_status "ERROR" "COGNITO_DOMAIN environment variable is required"
        exit 1
    fi
    
    print_status "SUCCESS" "Prerequisites check passed"
}

# Function to run security scan
run_security_scan() {
    print_status "INFO" "Running security scan..."
    
    if [ -f "security-scan.sh" ]; then
        chmod +x security-scan.sh
        if ./security-scan.sh; then
            print_status "SUCCESS" "Security scan passed"
        else
            print_status "ERROR" "Security scan failed"
            exit 1
        fi
    else
        print_status "WARNING" "Security scan script not found"
    fi
}

# Function to create backup
create_backup() {
    print_status "INFO" "Creating backup of current deployment..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_name="${STACK_NAME}-backup-${timestamp}"
    
    # Create RDS snapshot
    if aws rds describe-db-instances --db-instance-identifier "${STACK_NAME}-db-${ENVIRONMENT}" &> /dev/null; then
        print_status "INFO" "Creating RDS snapshot..."
        aws rds create-db-snapshot \
            --db-instance-identifier "${STACK_NAME}-db-${ENVIRONMENT}" \
            --db-snapshot-identifier "${backup_name}" \
            --region $REGION
        
        print_status "SUCCESS" "RDS snapshot created: ${backup_name}"
    fi
    
    # Backup CloudFormation template
    if aws cloudformation describe-stacks --stack-name "${STACK_NAME}-${ENVIRONMENT}" --region $REGION &> /dev/null; then
        print_status "INFO" "Backing up CloudFormation template..."
        aws cloudformation get-template \
            --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
            --region $REGION \
            --query 'TemplateBody' \
            --output json > "backup-${timestamp}.json"
        
        print_status "SUCCESS" "CloudFormation template backed up"
    fi
    
    echo $backup_name > .last-backup
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "INFO" "Deploying infrastructure..."
    
    # Deploy main stack
    aws cloudformation deploy \
        --template-file cloudformation/main-stack.yml \
        --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            DBPassword=$DB_PASSWORD \
            CognitoDomain=$COGNITO_DOMAIN \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region $REGION \
        --no-fail-on-empty-changeset
    
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "Infrastructure deployment completed"
    else
        print_status "ERROR" "Infrastructure deployment failed"
        exit 1
    fi
    
    # Deploy CDN and caching stack
    if [ -f "cloudformation/cdn-cache-stack.yml" ]; then
        print_status "INFO" "Deploying CDN and caching..."
        
        # Get API Gateway ID from main stack
        API_GATEWAY_ID=$(aws cloudformation describe-stacks \
            --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
            --region $REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayId`].OutputValue' \
            --output text)
        
        aws cloudformation deploy \
            --template-file cloudformation/cdn-cache-stack.yml \
            --stack-name "${STACK_NAME}-cdn-${ENVIRONMENT}" \
            --parameter-overrides \
                Environment=$ENVIRONMENT \
                ApiGatewayId=$API_GATEWAY_ID \
            --capabilities CAPABILITY_IAM \
            --region $REGION \
            --no-fail-on-empty-changeset
        
        print_status "SUCCESS" "CDN and caching deployment completed"
    fi
}

# Function to deploy application
deploy_application() {
    print_status "INFO" "Deploying application..."
    
    # Build and deploy backend
    if [ -d "../app" ]; then
        print_status "INFO" "Building backend application..."
        cd ../app
        
        # Build with Gradle
        ./gradlew clean build -x test
        
        # Package for Lambda
        ./gradlew buildZip
        
        # Deploy Lambda functions
        for function in attendance records employees corrections; do
            print_status "INFO" "Deploying ${function} Lambda function..."
            
            aws lambda update-function-code \
                --function-name "${STACK_NAME}-${function}-${ENVIRONMENT}" \
                --zip-file fileb://build/distributions/app.zip \
                --region $REGION
        done
        
        cd - > /dev/null
        print_status "SUCCESS" "Backend deployment completed"
    fi
    
    # Build and deploy frontend
    if [ -d "../frontend" ]; then
        print_status "INFO" "Building frontend application..."
        cd ../frontend
        
        # Install dependencies and build
        npm ci
        npm run build
        
        # Get S3 bucket name from CloudFormation
        S3_BUCKET=$(aws cloudformation describe-stacks \
            --stack-name "${STACK_NAME}-cdn-${ENVIRONMENT}" \
            --region $REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketName`].OutputValue' \
            --output text)
        
        if [ -n "$S3_BUCKET" ]; then
            print_status "INFO" "Deploying frontend to S3..."
            aws s3 sync .output/public/ s3://$S3_BUCKET/ --delete --region $REGION
            
            # Invalidate CloudFront cache
            CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
                --stack-name "${STACK_NAME}-cdn-${ENVIRONMENT}" \
                --region $REGION \
                --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
                --output text)
            
            if [ -n "$CLOUDFRONT_ID" ]; then
                print_status "INFO" "Invalidating CloudFront cache..."
                aws cloudfront create-invalidation \
                    --distribution-id $CLOUDFRONT_ID \
                    --paths "/*" \
                    --region $REGION
            fi
        fi
        
        cd - > /dev/null
        print_status "SUCCESS" "Frontend deployment completed"
    fi
}

# Function to run health checks
run_health_checks() {
    print_status "INFO" "Running health checks..."
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)
    
    if [ -n "$API_URL" ]; then
        # Test API health endpoint
        if curl -f -s "${API_URL}/health" > /dev/null; then
            print_status "SUCCESS" "API health check passed"
        else
            print_status "ERROR" "API health check failed"
            return 1
        fi
    fi
    
    # Get CloudFront URL
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}-cdn-${ENVIRONMENT}" \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
        --output text)
    
    if [ -n "$CLOUDFRONT_URL" ]; then
        # Test frontend
        if curl -f -s "https://${CLOUDFRONT_URL}" > /dev/null; then
            print_status "SUCCESS" "Frontend health check passed"
        else
            print_status "ERROR" "Frontend health check failed"
            return 1
        fi
    fi
    
    print_status "SUCCESS" "All health checks passed"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "INFO" "Setting up monitoring and alerts..."
    
    # Deploy monitoring stack if exists
    if [ -f "cloudformation/monitoring-stack.yml" ]; then
        aws cloudformation deploy \
            --template-file cloudformation/monitoring-stack.yml \
            --stack-name "${STACK_NAME}-monitoring-${ENVIRONMENT}" \
            --parameter-overrides \
                Environment=$ENVIRONMENT \
                StackName="${STACK_NAME}-${ENVIRONMENT}" \
            --capabilities CAPABILITY_IAM \
            --region $REGION \
            --no-fail-on-empty-changeset
        
        print_status "SUCCESS" "Monitoring setup completed"
    else
        print_status "WARNING" "Monitoring stack template not found"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_status "INFO" "Cleaning up old backups..."
    
    # Cleanup old RDS snapshots
    local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y-%m-%d)
    
    aws rds describe-db-snapshots \
        --db-instance-identifier "${STACK_NAME}-db-${ENVIRONMENT}" \
        --snapshot-type manual \
        --region $REGION \
        --query "DBSnapshots[?SnapshotCreateTime<'${cutoff_date}'].DBSnapshotIdentifier" \
        --output text | while read snapshot; do
        if [ -n "$snapshot" ]; then
            print_status "INFO" "Deleting old snapshot: $snapshot"
            aws rds delete-db-snapshot \
                --db-snapshot-identifier "$snapshot" \
                --region $REGION
        fi
    done
    
    print_status "SUCCESS" "Backup cleanup completed"
}

# Function to rollback deployment
rollback_deployment() {
    print_status "WARNING" "Rolling back deployment..."
    
    if [ -f ".last-backup" ]; then
        local backup_name=$(cat .last-backup)
        print_status "INFO" "Rolling back to backup: $backup_name"
        
        # Restore RDS from snapshot
        aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier "${STACK_NAME}-db-${ENVIRONMENT}-rollback" \
            --db-snapshot-identifier "$backup_name" \
            --region $REGION
        
        print_status "SUCCESS" "Rollback initiated"
    else
        print_status "ERROR" "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    echo "🚀 Starting Production Deployment"
    echo "================================="
    echo "Stack: ${STACK_NAME}-${ENVIRONMENT}"
    echo "Region: $REGION"
    echo "Timestamp: $(date)"
    echo ""
    
    # Confirmation prompt
    read -p "Are you sure you want to deploy to production? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_status "INFO" "Deployment cancelled"
        exit 0
    fi
    
    # Execute deployment steps
    check_prerequisites
    run_security_scan
    create_backup
    
    # Deploy with error handling
    if deploy_infrastructure && deploy_application; then
        if run_health_checks; then
            setup_monitoring
            cleanup_old_backups
            
            print_status "SUCCESS" "Production deployment completed successfully!"
            
            # Display deployment information
            echo ""
            echo "🎉 Deployment Summary"
            echo "===================="
            echo "Environment: $ENVIRONMENT"
            echo "Region: $REGION"
            echo "Timestamp: $(date)"
            
            # Get URLs
            API_URL=$(aws cloudformation describe-stacks \
                --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
                --region $REGION \
                --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
                --output text 2>/dev/null || echo "Not available")
            
            CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
                --stack-name "${STACK_NAME}-cdn-${ENVIRONMENT}" \
                --region $REGION \
                --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
                --output text 2>/dev/null || echo "Not available")
            
            echo "API URL: $API_URL"
            echo "Frontend URL: https://$CLOUDFRONT_URL"
            echo ""
            echo "✅ System is now live in production!"
            
        else
            print_status "ERROR" "Health checks failed"
            rollback_deployment
            exit 1
        fi
    else
        print_status "ERROR" "Deployment failed"
        rollback_deployment
        exit 1
    fi
}

# Handle script interruption
trap 'print_status "ERROR" "Deployment interrupted"; rollback_deployment; exit 1' INT TERM

# Run main function
main "$@"