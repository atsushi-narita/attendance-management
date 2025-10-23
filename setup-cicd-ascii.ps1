# CI/CD Pipeline Setup Script (PowerShell)
param(
    [string]$Environment = "prod",
    [string]$Region = "ap-northeast-1", 
    [string]$GitHubRepo = "your-org/attendance-management",
    [string]$GitHubBranch = "main",
    [string]$GitHubToken = "",
    [switch]$Help
)

$StackName = "attendance-management-cicd"

function Write-InfoMessage($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-SuccessMessage($Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-ErrorMessage($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Usage {
    Write-Host "Usage: .\setup-cicd.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Environment ENV     Environment name (dev, staging, prod) [Default: prod]"
    Write-Host "  -Region REGION       AWS Region [Default: ap-northeast-1]"
    Write-Host "  -GitHubRepo REPO     GitHub Repository (owner/repo)"
    Write-Host "  -GitHubBranch BRANCH GitHub Branch [Default: main]"
    Write-Host "  -GitHubToken TOKEN   GitHub Access Token"
    Write-Host "  -Help               Show this help"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\setup-cicd.ps1 -GitHubRepo 'your-org/attendance-management' -GitHubToken 'ghp_xxxx'"
}

function Test-Prerequisites {
    Write-InfoMessage "Checking prerequisites..."
    
    try {
        $null = aws --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS CLI is not installed"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS CLI is not installed"
        return $false
    }
    
    try {
        $null = aws sts get-caller-identity 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS authentication is not configured"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS authentication is not configured"
        return $false
    }
    
    if ([string]::IsNullOrEmpty($GitHubToken)) {
        Write-ErrorMessage "GitHub access token is required (-GitHubToken option)"
        return $false
    }
    
    if (-not (Test-Path "infrastructure\cloudformation\cicd-pipeline-stack.yml")) {
        Write-ErrorMessage "CI/CD pipeline template not found"
        return $false
    }
    
    Write-SuccessMessage "Prerequisites check completed"
    return $true
}

function Set-Parameters {
    Write-InfoMessage "Setting Parameter Store parameters..."
    
    try {
        $null = aws ssm get-parameter --name "/attendance-management/$Environment/db-password" --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) {
            $DbPassword = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
            
            $null = aws ssm put-parameter --name "/attendance-management/$Environment/db-password" --value $DbPassword --type "SecureString" --description "Database password for $Environment environment" --region $Region
            
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorMessage "Failed to set Parameter Store"
                return $false
            }
            Write-SuccessMessage "Database password has been set"
        }
        else {
            Write-InfoMessage "Database password is already configured"
        }
    }
    catch {
        Write-ErrorMessage "Error occurred while setting Parameter Store"
        return $false
    }
    
    Write-SuccessMessage "Parameter Store setup completed"
    return $true
}

function Deploy-Pipeline {
    Write-InfoMessage "Deploying CI/CD pipeline..."
    
    try {
        $null = aws cloudformation deploy --template-file "infrastructure\cloudformation\cicd-pipeline-stack.yml" --stack-name "$StackName-$Environment" --parameter-overrides "Environment=$Environment" "GitHubRepository=$GitHubRepo" "GitHubBranch=$GitHubBranch" "GitHubToken=$GitHubToken" --capabilities CAPABILITY_NAMED_IAM --region $Region --no-fail-on-empty-changeset
        
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Failed to deploy CI/CD pipeline"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "Error occurred while deploying CI/CD pipeline"
        return $false
    }
    
    Write-SuccessMessage "CI/CD pipeline deployment completed"
    return $true
}

if ($Help) {
    Show-Usage
    exit 0
}

Write-InfoMessage "Starting CI/CD pipeline setup"
Write-Host "===================================="
Write-Host "Environment: $Environment"
Write-Host "Region: $Region"
Write-Host "GitHub Repository: $GitHubRepo"
Write-Host "GitHub Branch: $GitHubBranch"
Write-Host ""

if (-not (Test-Prerequisites)) {
    Write-ErrorMessage "Setup cancelled"
    exit 1
}

if (-not (Set-Parameters)) {
    Write-ErrorMessage "Setup cancelled"
    exit 1
}

if (-not (Deploy-Pipeline)) {
    Write-ErrorMessage "Setup cancelled"
    exit 1
}

Write-SuccessMessage "Setup completed successfully!"