"""Authenticated operational endpoints for health and metrics."""

from flask import Blueprint, Response, jsonify, request

from ops import metrics as ops_metrics
from ops.health import build_health_snapshot

ops_bp = Blueprint("ops", __name__, url_prefix="/api/ops")


@ops_bp.route("/health", methods=["GET"])
def ops_health():
    return jsonify(build_health_snapshot())


@ops_bp.route("/metrics", methods=["GET"])
def metrics_endpoint():
    requested = request.args.get("format", "json").strip().lower()
    if requested not in {"json", "prometheus"}:
        return jsonify({"error": "format must be json or prometheus"}), 400
    snapshot = ops_metrics.snapshot()
    if requested == "prometheus":
        return Response(
            ops_metrics.render_prometheus(snapshot),
            content_type="text/plain; version=0.0.4; charset=utf-8",
        )
    return jsonify(snapshot)
