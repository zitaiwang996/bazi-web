# -*- coding: utf-8 -*-
"""
Bazi Fortune-Telling Web App
Flask server — serves the web UI and API endpoint
"""
import sys, io, os, webbrowser, json
from datetime import datetime
from flask import Flask, render_template, request, jsonify

# Add project to path and import engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bazi_engine import calculate_bazi

app = Flask(__name__)


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    """Calculate bazi chart from form data."""
    try:
        data = request.get_json()
        solar_date = data.get('solar_date', '')
        time_str = data.get('time', '')
        gender = data.get('gender', 'male')

        if not solar_date or not time_str:
            return jsonify({'error': '请提供完整的出生日期和时间'}), 400

        # Calculate
        result = calculate_bazi(solar_date, time_str, gender)

        # Make result JSON-serializable
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'计算出错: {str(e)}'}), 500


def main():
    """Start the web server and open browser (local mode)."""
    port = int(os.environ.get('PORT', 5000))
    is_production = 'PORT' in os.environ or os.environ.get('RENDER') == '1'
    host = '0.0.0.0' if is_production else '127.0.0.1'
    url = f'http://127.0.0.1:{port}'

    if not is_production:
        print(f'\n{"="*60}')
        print(f'  八字命理推算系统 v1.0')
        print(f'  金镖门盲派八字 · 天文节气精确排盘')
        print(f'{"="*60}')
        print(f'\n  启动服务器: {url}')
        print(f'  按 Ctrl+C 停止\n')
        webbrowser.open(url)

    app.run(host=host, port=port, debug=False)


if __name__ == '__main__':
    main()
