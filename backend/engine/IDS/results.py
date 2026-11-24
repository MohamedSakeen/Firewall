"""Small value objects shared by IDS detectors."""

from dataclasses import dataclass


@dataclass(frozen=True)
class DetectionResult:
    matched: bool
    detector: str
    rule_id: str
    observed: int
    threshold: int
    window_seconds: int
