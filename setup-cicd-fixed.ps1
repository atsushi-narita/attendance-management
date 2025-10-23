# CI/CD 繝代う繝励Λ繧､繝ｳ 繧ｻ繝・ヨ繧｢繝・・繧ｹ繧ｯ繝ｪ繝励ヨ (PowerShell迚・
# ===========================================================

param(
    [string]$Environment = "prod",
    [string]$Region = "ap-northeast-1", 
    [string]$GitHubRepo = "your-org/attendance-management",
    [string]$GitHubBranch = "main",
    [string]$GitHubToken = "",
    [switch]$Help
)

# 險ｭ螳・
$StackName = "attendance-management-cicd"

# 濶ｲ莉倥″繝ｭ繧ｰ蜃ｺ蜉幃未謨ｰ
function Write-InfoMessage {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-SuccessMessage {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 繝倥Ν繝苓｡ｨ遉ｺ
function Show-Usage {
    Write-Host "菴ｿ逕ｨ譁ｹ豕・ .\setup-cicd.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "繧ｪ繝励す繝ｧ繝ｳ:"
    Write-Host "  -Environment ENV     迺ｰ蠅・錐 (dev, staging, prod) [繝・ヵ繧ｩ繝ｫ繝・ prod]"
    Write-Host "  -Region REGION       AWS繝ｪ繝ｼ繧ｸ繝ｧ繝ｳ [繝・ヵ繧ｩ繝ｫ繝・ ap-northeast-1]"
    Write-Host "  -GitHubRepo REPO     GitHub繝ｪ繝昴ず繝医Μ (owner/repo)"
    Write-Host "  -GitHubBranch BRANCH GitHub繝悶Λ繝ｳ繝・[繝・ヵ繧ｩ繝ｫ繝・ main]"
    Write-Host "  -GitHubToken TOKEN   GitHub繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ"
    Write-Host "  -Help               縺薙・繝倥Ν繝励ｒ陦ｨ遉ｺ"
    Write-Host ""
    Write-Host "萓・"
    Write-Host "  .\setup-cicd.ps1 -GitHubRepo 'your-org/attendance-management' -GitHubToken 'ghp_xxxx'"
}

# 蜑肴署譚｡莉ｶ繝√ぉ繝・け
function Test-Prerequisites {
    Write-InfoMessage "蜑肴署譚｡莉ｶ繧偵メ繧ｧ繝・け荳ｭ..."
    
    # AWS CLI遒ｺ隱・
    try {
        $null = Invoke-Expression "aws --version" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS CLI縺後う繝ｳ繧ｹ繝医・繝ｫ縺輔ｌ縺ｦ縺・∪縺帙ｓ"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS CLI縺後う繝ｳ繧ｹ繝医・繝ｫ縺輔ｌ縺ｦ縺・∪縺帙ｓ"
        return $false
    }
    
    # AWS隱崎ｨｼ遒ｺ隱・
    try {
        $null = Invoke-Expression "aws sts get-caller-identity" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "AWS隱崎ｨｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "AWS隱崎ｨｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ"
        return $false
    }
    
    # GitHub繝医・繧ｯ繝ｳ遒ｺ隱・
    if ([string]::IsNullOrEmpty($GitHubToken)) {
        Write-ErrorMessage "GitHub繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ縺悟ｿ・ｦ√〒縺・(-GitHubToken 繧ｪ繝励す繝ｧ繝ｳ)"
        return $false
    }
    
    # CloudFormation繝・Φ繝励Ξ繝ｼ繝亥ｭ伜惠遒ｺ隱・
    if (-not (Test-Path "infrastructure\cloudformation\cicd-pipeline-stack.yml")) {
        Write-ErrorMessage "CI/CD繝代う繝励Λ繧､繝ｳ繝・Φ繝励Ξ繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ"
        return $false
    }
    
    Write-SuccessMessage "蜑肴署譚｡莉ｶ繝√ぉ繝・け螳御ｺ・
    return $true
}

# Parameter Store險ｭ螳・
function Set-Parameters {
    Write-InfoMessage "Parameter Store 繝代Λ繝｡繝ｼ繧ｿ繧定ｨｭ螳壻ｸｭ..."
    
    # 繝・・繧ｿ繝吶・繧ｹ繝代せ繝ｯ繝ｼ繝臥｢ｺ隱・
    try {
        $null = Invoke-Expression "aws ssm get-parameter --name '/attendance-management/$Environment/db-password' --region $Region" 2>$null
        if ($LASTEXITCODE -ne 0) {
            # 繝ｩ繝ｳ繝繝繝代せ繝ｯ繝ｼ繝臥函謌・
            $DbPassword = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
            
            $putParameterCmd = "aws ssm put-parameter --name '/attendance-management/$Environment/db-password' --value '$DbPassword' --type 'SecureString' --description 'Database password for $Environment environment' --region $Region"
            $null = Invoke-Expression $putParameterCmd
            
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorMessage "Parameter Store險ｭ螳壹↓螟ｱ謨励＠縺ｾ縺励◆"
                return $false
            }
            Write-SuccessMessage "繝・・繧ｿ繝吶・繧ｹ繝代せ繝ｯ繝ｼ繝峨ｒ險ｭ螳壹＠縺ｾ縺励◆"
        }
        else {
            Write-InfoMessage "繝・・繧ｿ繝吶・繧ｹ繝代せ繝ｯ繝ｼ繝峨・譌｢縺ｫ險ｭ螳壽ｸ医∩縺ｧ縺・
        }
    }
    catch {
        Write-ErrorMessage "Parameter Store險ｭ螳壻ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: $($_.Exception.Message)"
        return $false
    }
    
    Write-SuccessMessage "Parameter Store險ｭ螳壼ｮ御ｺ・
    return $true
}

# CI/CD繝代う繝励Λ繧､繝ｳ菴懈・
function Deploy-Pipeline {
    Write-InfoMessage "CI/CD繝代う繝励Λ繧､繝ｳ繧偵ョ繝励Ο繧､荳ｭ..."
    
    try {
        $deployCmd = "aws cloudformation deploy --template-file 'infrastructure\cloudformation\cicd-pipeline-stack.yml' --stack-name '$StackName-$Environment' --parameter-overrides 'Environment=$Environment' 'GitHubRepository=$GitHubRepo' 'GitHubBranch=$GitHubBranch' 'GitHubToken=$GitHubToken' --capabilities CAPABILITY_NAMED_IAM --region $Region --no-fail-on-empty-changeset"
        
        $null = Invoke-Expression $deployCmd
        
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "CI/CD繝代う繝励Λ繧､繝ｳ繝・・繝ｭ繧､縺ｫ螟ｱ謨励＠縺ｾ縺励◆"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "CI/CD繝代う繝励Λ繧､繝ｳ繝・・繝ｭ繧､荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: $($_.Exception.Message)"
        return $false
    }
    
    Write-SuccessMessage "CI/CD繝代う繝励Λ繧､繝ｳ繝・・繝ｭ繧､螳御ｺ・
    return $true
}

# 繝・・繝ｭ繧､諠・ｱ陦ｨ遉ｺ
function Show-DeploymentInfo {
    Write-InfoMessage "繝・・繝ｭ繧､繝｡繝ｳ繝域ュ蝣ｱ繧貞叙蠕嶺ｸｭ..."
    
    try {
        # 繝代う繝励Λ繧､繝ｳ蜷榊叙蠕・
        $getPipelineNameCmd = "aws cloudformation describe-stacks --stack-name '$StackName-$Environment' --region $Region --query 'Stacks[0].Outputs[?OutputKey==``PipelineName``].OutputValue' --output text"
        $PipelineName = Invoke-Expression $getPipelineNameCmd 2>$null
        
        if ([string]::IsNullOrEmpty($PipelineName) -or $LASTEXITCODE -ne 0) {
            $PipelineName = "蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆"
        }
        
        # 繝代う繝励Λ繧､繝ｳURL蜿門ｾ・
        $getPipelineUrlCmd = "aws cloudformation describe-stacks --stack-name '$StackName-$Environment' --region $Region --query 'Stacks[0].Outputs[?OutputKey==``PipelineUrl``].OutputValue' --output text"
        $PipelineUrl = Invoke-Expression $getPipelineUrlCmd 2>$null
        
        if ([string]::IsNullOrEmpty($PipelineUrl) -or $LASTEXITCODE -ne 0) {
            $PipelineUrl = "蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆"
        }
    }
    catch {
        $PipelineName = "蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆"
        $PipelineUrl = "蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆"
    }
    
    Write-Host ""
    Write-SuccessMessage "CI/CD 繝代う繝励Λ繧､繝ｳ 繧ｻ繝・ヨ繧｢繝・・螳御ｺ・
    Write-Host "====================================="
    Write-Host "迺ｰ蠅・ $Environment"
    Write-Host "繝ｪ繝ｼ繧ｸ繝ｧ繝ｳ: $Region"
    Write-Host "繝代う繝励Λ繧､繝ｳ蜷・ $PipelineName"
    Write-Host "繝代う繝励Λ繧､繝ｳURL: $PipelineUrl"
    Write-Host ""
    Write-Host "谺｡縺ｮ繧ｹ繝・ャ繝・"
    Write-Host "1. GitHub縺ｫ繧ｳ繝ｼ繝峨ｒ繝励ャ繧ｷ繝･縺励※繝代う繝励Λ繧､繝ｳ繧貞ｮ溯｡・
    Write-Host "2. AWS CodePipeline繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ螳溯｡檎憾豕√ｒ遒ｺ隱・
    Write-Host "3. 蠢・ｦ√↓蠢懊§縺ｦ繧､繝ｳ繝輔Λ繧ｹ繧ｿ繝・け繧剃ｺ句燕縺ｫ繝・・繝ｭ繧､"
    Write-Host ""
    Write-Host "萓ｿ蛻ｩ縺ｪ繝ｪ繝ｳ繧ｯ:"
    Write-Host "CodePipeline繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ: https://console.aws.amazon.com/codesuite/codepipeline/pipelines"
    Write-Host "CloudWatch繝ｭ繧ｰ: https://console.aws.amazon.com/cloudwatch/home?region=$Region#logsV2:log-groups"
    Write-Host ""
    
    return $PipelineName
}

# 謇句虚繝代う繝励Λ繧､繝ｳ螳溯｡・
function Start-Pipeline {
    param([string]$PipelineName)
    
    if ($PipelineName -eq "蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆") {
        return
    }
    
    $response = Read-Host "繝代う繝励Λ繧､繝ｳ繧呈焔蜍募ｮ溯｡後＠縺ｾ縺吶°・・(y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-InfoMessage "繝代う繝励Λ繧､繝ｳ繧帝幕蟋倶ｸｭ..."
        
        try {
            $ExecutionId = aws codepipeline start-pipeline-execution `
                --name $PipelineName `
                --region $Region `
                --query "pipelineExecutionId" `
                --output text 2>$null
            
            if (-not [string]::IsNullOrEmpty($ExecutionId) -and $LASTEXITCODE -eq 0) {
                Write-SuccessMessage "繝代う繝励Λ繧､繝ｳ縺碁幕蟋九＆繧後∪縺励◆: $ExecutionId"
                $PipelineUrl = aws cloudformation describe-stacks `
                    --stack-name "$StackName-$Environment" `
                    --region $Region `
                    --query "Stacks[0].Outputs[?OutputKey=='PipelineUrl'].OutputValue" `
                    --output text 2>$null
                Write-Host "螳溯｡檎憾豕・ $PipelineUrl"
            }
            else {
                Write-WarningMessage "繝代う繝励Λ繧､繝ｳ縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆"
            }
        }
        catch {
            Write-WarningMessage "繝代う繝励Λ繧､繝ｳ縺ｮ髢句ｧ倶ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆"
        }
    }
}

# 繝｡繧､繝ｳ蜃ｦ逅・
function Main {
    # 繝倥Ν繝苓｡ｨ遉ｺ
    if ($Help) {
        Show-Usage
        return
    }
    
    Write-InfoMessage "CI/CD 繝代う繝励Λ繧､繝ｳ 繧ｻ繝・ヨ繧｢繝・・髢句ｧ・
    Write-Host "===================================="
    Write-Host "迺ｰ蠅・ $Environment"
    Write-Host "繝ｪ繝ｼ繧ｸ繝ｧ繝ｳ: $Region"
    Write-Host "GitHub繝ｪ繝昴ず繝医Μ: $GitHubRepo"
    Write-Host "GitHub繝悶Λ繝ｳ繝・ $GitHubBranch"
    Write-Host ""
    
    # 蜑肴署譚｡莉ｶ繝√ぉ繝・け
    if (-not (Test-Prerequisites)) {
        Write-ErrorMessage "繧ｻ繝・ヨ繧｢繝・・繧剃ｸｭ豁｢縺励∪縺・
        exit 1
    }
    
    # Parameter Store險ｭ螳・
    if (-not (Set-Parameters)) {
        Write-ErrorMessage "繧ｻ繝・ヨ繧｢繝・・繧剃ｸｭ豁｢縺励∪縺・
        exit 1
    }
    
    # CI/CD繝代う繝励Λ繧､繝ｳ菴懈・
    if (-not (Deploy-Pipeline)) {
        Write-ErrorMessage "繧ｻ繝・ヨ繧｢繝・・繧剃ｸｭ豁｢縺励∪縺・
        exit 1
    }
    
    # 繝・・繝ｭ繧､諠・ｱ陦ｨ遉ｺ
    $PipelineName = Show-DeploymentInfo
    
    # 謇句虚繝代う繝励Λ繧､繝ｳ螳溯｡・
    Start-Pipeline -PipelineName $PipelineName
    
    Write-SuccessMessage "繧ｻ繝・ヨ繧｢繝・・螳御ｺ・ｼ・
}

# 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
$ErrorActionPreference = "Stop"

try {
    Main
}
catch {
    Write-ErrorMessage "繧ｻ繝・ヨ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: $($_.Exception.Message)"
    exit 1
}
