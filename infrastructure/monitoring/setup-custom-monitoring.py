#!/usr/bin/env python3
"""
勤怠管理ツール - カスタム監視設定スクリプト
CloudWatch カスタムメトリクス、ログフィルター、アラームを設定
"""

import boto3
import json
import yaml
import argparse
import sys
from typing import Dict, List, Any

class CustomMonitoringSetup:
    def __init__(self, environment: str, project_name: str, region: str):
        self.environment = environment
        self.project_name = project_name
        self.region = region
        
        # AWS クライアントの初期化
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        
        # 設定ファイルの読み込み
        with open('custom-metrics.yaml', 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
    
    def create_log_metric_filters(self):
        """ログメトリクスフィルターの作成"""
        print("Creating log metric filters...")
        
        log_group_name = f'/aws/lambda/{self.project_name}-{self.environment}'
        
        for pattern_config in self.config['log_monitoring']['patterns']:
            filter_name = f"{self.project_name}-{self.environment}-{pattern_config['name']}"
            
            try:
                self.logs.put_metric_filter(
                    logGroupName=log_group_name,
                    filterName=filter_name,
                    filterPattern=pattern_config['pattern'],
                    metricTransformations=[
                        {
                            'metricName': pattern_config['metric_name'],
                            'metricNamespace': f'{self.project_name}/{self.environment}',
                            'metricValue': pattern_config['metric_value'],
                            'defaultValue': 0
                        }
                    ]
                )
                print(f"✓ Created metric filter: {filter_name}")
            except Exception as e:
                print(f"✗ Failed to create metric filter {filter_name}: {e}")
    
    def create_custom_alarms(self):
        """カスタムアラームの作成"""
        print("Creating custom alarms...")
        
        # SNS トピック ARN を取得
        topic_arn = self._get_sns_topic_arn()
        
        for severity, thresholds in self.config['alert_thresholds'].items():
            for threshold_config in thresholds:
                alarm_name = f"{self.project_name}-{self.environment}-{threshold_config['metric']}-{severity}"
                
                try:
                    self.cloudwatch.put_metric_alarm(
                        AlarmName=alarm_name,
                        ComparisonOperator=threshold_config['comparison'],
                        EvaluationPeriods=threshold_config['evaluation_periods'],
                        MetricName=threshold_config['metric'],
                        Namespace=f'{self.project_name}/{self.environment}',
                        Period=threshold_config['period'],
                        Statistic='Sum',
                        Threshold=threshold_config['threshold'],
                        ActionsEnabled=True,
                        AlarmActions=[topic_arn] if topic_arn else [],
                        AlarmDescription=f"{severity.upper()}: {threshold_config['metric']} threshold exceeded",
                        Unit='Count'
                    )
                    print(f"✓ Created alarm: {alarm_name}")
                except Exception as e:
                    print(f"✗ Failed to create alarm {alarm_name}: {e}")
    
    def create_custom_dashboard(self):
        """カスタムダッシュボードの作成"""
        print("Creating custom dashboard...")
        
        dashboard_name = f"{self.project_name}-{self.environment}-custom"
        
        # ダッシュボードウィジェットの構築
        widgets = []
        x_pos = 0
        y_pos = 0
        
        for widget_config in self.config['dashboard_widgets']:
            widget = {
                "type": "metric",
                "x": x_pos,
                "y": y_pos,
                "width": widget_config['width'],
                "height": widget_config['height'],
                "properties": {
                    "metrics": [
                        [f'{self.project_name}/{self.environment}', metric]
                        for metric in widget_config['metrics']
                    ],
                    "view": "timeSeries" if widget_config['type'] == 'line' else widget_config['type'],
                    "stacked": widget_config['type'] == 'stacked_area',
                    "region": self.region,
                    "title": widget_config['name'],
                    "period": widget_config['period']
                }
            }
            
            widgets.append(widget)
            
            # 次のウィジェットの位置を計算
            x_pos += widget_config['width']
            if x_pos >= 24:  # 1行の最大幅
                x_pos = 0
                y_pos += widget_config['height']
        
        dashboard_body = json.dumps({"widgets": widgets})
        
        try:
            self.cloudwatch.put_dashboard(
                DashboardName=dashboard_name,
                DashboardBody=dashboard_body
            )
            print(f"✓ Created dashboard: {dashboard_name}")
            print(f"  Dashboard URL: https://console.aws.amazon.com/cloudwatch/home?region={self.region}#dashboards:name={dashboard_name}")
        except Exception as e:
            print(f"✗ Failed to create dashboard: {e}")
    
    def setup_log_insights_queries(self):
        """CloudWatch Insights クエリの設定"""
        print("Setting up CloudWatch Insights queries...")
        
        queries = [
            {
                "name": f"{self.project_name}-{self.environment}-attendance-analysis",
                "query": """
                fields @timestamp, @message, employee_id, action
                | filter @message like /ATTENDANCE/
                | stats count() by action, bin(1h)
                | sort @timestamp desc
                """,
                "log_groups": [f'/aws/lambda/{self.project_name}-{self.environment}']
            },
            {
                "name": f"{self.project_name}-{self.environment}-error-analysis",
                "query": """
                fields @timestamp, @message, @requestId
                | filter @message like /ERROR/
                | stats count() by bin(5m)
                | sort @timestamp desc
                """,
                "log_groups": [f'/aws/lambda/{self.project_name}-{self.environment}']
            },
            {
                "name": f"{self.project_name}-{self.environment}-performance-analysis",
                "query": """
                fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
                | filter @type = "REPORT"
                | stats avg(@duration), max(@duration), min(@duration) by bin(5m)
                """,
                "log_groups": [f'/aws/lambda/{self.project_name}-{self.environment}']
            }
        ]
        
        for query_config in queries:
            try:
                self.logs.put_query_definition(
                    name=query_config['name'],
                    queryString=query_config['query'],
                    logGroupNames=query_config['log_groups']
                )
                print(f"✓ Created Insights query: {query_config['name']}")
            except Exception as e:
                print(f"✗ Failed to create Insights query {query_config['name']}: {e}")
    
    def _get_sns_topic_arn(self) -> str:
        """SNS トピック ARN を取得"""
        try:
            # CloudFormation スタックから SNS トピック ARN を取得
            cf = boto3.client('cloudformation', region_name=self.region)
            stack_name = f"{self.project_name}-{self.environment}-monitoring"
            
            response = cf.describe_stacks(StackName=stack_name)
            outputs = response['Stacks'][0]['Outputs']
            
            for output in outputs:
                if output['OutputKey'] == 'AlertTopicArn':
                    return output['OutputValue']
        except Exception as e:
            print(f"Warning: Could not retrieve SNS topic ARN: {e}")
        
        return ""
    
    def run_setup(self):
        """全ての監視設定を実行"""
        print(f"=== Setting up custom monitoring for {self.project_name}-{self.environment} ===")
        print(f"Region: {self.region}")
        print()
        
        try:
            self.create_log_metric_filters()
            print()
            
            self.create_custom_alarms()
            print()
            
            self.create_custom_dashboard()
            print()
            
            self.setup_log_insights_queries()
            print()
            
            print("=== Custom monitoring setup completed successfully! ===")
            
        except Exception as e:
            print(f"Setup failed: {e}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='勤怠管理ツール カスタム監視設定')
    parser.add_argument('environment', choices=['dev', 'staging', 'prod'], help='環境名')
    parser.add_argument('--project-name', default='attendance-management', help='プロジェクト名')
    parser.add_argument('--region', default='ap-northeast-1', help='AWS リージョン')
    
    args = parser.parse_args()
    
    setup = CustomMonitoringSetup(args.environment, args.project_name, args.region)
    setup.run_setup()

if __name__ == '__main__':
    main()