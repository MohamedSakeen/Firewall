# Compatibility alias for escalate_engine.py
from engine.IPS.escalate_engine import register_offense, calculate_ban_duration, offense_counter

__all__ = ["register_offense", "calculate_ban_duration", "offense_counter"]