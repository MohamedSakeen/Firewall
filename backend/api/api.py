from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/alerts")
def alerts():
    with open(r"\backend\IDS\alerts.log", "r") as f:
        data = f.readlines()
    return jsonify(data)
@app.route("/blocked")
def blocked():
    with open(r"\backend\IDS\blocked.log", "r") as f:
        data = f.readlines()
    return jsonify(data)

app.run(debug=True)