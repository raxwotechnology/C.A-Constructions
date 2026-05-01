#!/usr/bin/env python3
"""
Raxwo AI Analytics Flask Microservice
Wraps existing Python analytics scripts into REST API endpoints
Runs on port 5001
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import sys
import os
import math
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

# ---- Project Predictor ----
class AIProjectPredictor:
    def calculate_velocity(self, logs):
        if len(logs) < 2:
            return 0.5
        logs = sorted(logs, key=lambda x: x.get('logDate', x.get('log_date', '')))
        velocities = []
        for i in range(1, len(logs)):
            try:
                prev_p = float(logs[i-1].get('progressPercentage', logs[i-1].get('progress_percentage', 0)))
                curr_p = float(logs[i].get('progressPercentage', logs[i].get('progress_percentage', 0)))
                prev_d = datetime.fromisoformat(str(logs[i-1].get('logDate', logs[i-1].get('log_date', '')))[:10])
                curr_d = datetime.fromisoformat(str(logs[i].get('logDate', logs[i].get('log_date', '')))[:10])
                days = (curr_d - prev_d).days
                if days > 0:
                    velocities.append((curr_p - prev_p) / days)
            except:
                continue
        return sum(velocities) / len(velocities) if velocities else 0.5

    def predict(self, project, milestones, progress_logs):
        current = float(project.get('progressPercentage', project.get('progress_percentage', 0)))
        remaining = 100.0 - current
        velocity = self.calculate_velocity(progress_logs)
        if velocity <= 0:
            velocity = 0.5

        base_days = remaining / velocity

        # Complexity
        type_mult = {'web_development': 1.0, 'mobile_app': 1.15, 'api_development': 0.9, 'design': 0.85, 'testing': 0.8, 'maintenance': 0.7, 'other': 1.0}
        base_days *= type_mult.get(project.get('projectType', project.get('project_type', 'other')), 1.0)

        # Priority
        prio_mult = {'urgent': 0.8, 'high': 0.9, 'medium': 1.0, 'low': 1.1}
        base_days *= prio_mult.get(project.get('priority', 'medium'), 1.0)

        # Confidence
        confidence = min(0.95, max(0.5, 0.7 + (len(progress_logs) >= 5) * 0.1 + (len(milestones) >= 3) * 0.05))

        predicted_date = datetime.now() + timedelta(days=int(base_days))

        return {
            'predicted_completion_date': predicted_date.strftime('%Y-%m-%d'),
            'days_remaining': int(base_days),
            'confidence_score': round(confidence, 2),
            'estimated_velocity': round(velocity, 2),
        }

predictor = AIProjectPredictor()

# ---- Routes ----

@app.route('/api/predict-project', methods=['POST'])
def predict_project():
    try:
        data = request.json
        result = predictor.predict(
            data.get('project', {}),
            data.get('milestones', []),
            data.get('progress_logs', [])
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/overview', methods=['GET'])
def analytics_overview():
    """Returns AI forecasts and analytics overview"""
    # Generate mock forecast data (replace with actual ML models in production)
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    current_month = datetime.now().month

    sales_forecast = [
        {'month': months[i], 'predicted': round(50000 + i * 3000 + random.uniform(-2000, 2000), 2), 'confidence': round(0.85 - i * 0.02, 2)}
        for i in range(current_month, min(current_month + 3, 12))
    ]

    profit_forecast = [
        {'month': months[i], 'predicted': round(20000 + i * 1500 + random.uniform(-1000, 1000), 2)}
        for i in range(current_month, min(current_month + 3, 12))
    ]

    expense_forecast = [
        {'month': months[i], 'predicted': round(30000 + i * 1000 + random.uniform(-500, 500), 2)}
        for i in range(current_month, min(current_month + 3, 12))
    ]

    return jsonify({
        'salesForecast': sales_forecast,
        'profitForecast': profit_forecast,
        'expenseForecast': expense_forecast,
        'modelAccuracy': 0.87,
        'lastUpdated': datetime.now().isoformat(),
    })

@app.route('/api/attendance/analyze', methods=['POST'])
def analyze_attendance():
    """Analyze biometric attendance data"""
    try:
        data = request.json
        typing_pattern = data.get('typing_pattern', {})
        mouse_pattern = data.get('mouse_pattern', [])

        # Simple scoring — in production would use ML model
        keystroke_count = len(typing_pattern.get('keystrokes', []))
        mouse_movements = len(mouse_pattern)

        score = min(100, (keystroke_count * 3 + mouse_movements * 2) / 2)

        return jsonify({
            'biometric_score': round(score),
            'verified': score > 60,
            'confidence': round(min(0.95, score / 100), 2),
            'keystroke_analysis': {'count': keystroke_count, 'rhythm_score': round(score * 0.7, 1)},
            'mouse_analysis': {'movements': mouse_movements, 'pattern_score': round(min(100, mouse_movements * 2), 1)},
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'Raxwo AI Analytics', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    print("🤖 Raxwo AI Analytics Microservice starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
