from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


@app.route("/alerts")
def alerts():
    with (LOG_DIR / "alerts.log").open("r") as f:
        data = f.readlines()
    return jsonify(data)


@app.route("/blocked")
def blocked():
    with (LOG_DIR / "blocked.log").open("r") as f:
        data = f.readlines()
    return jsonify(data)


app.run(debug=True)