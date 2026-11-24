"""Flask-Login user object built from a database row."""

from flask_login import UserMixin


class User(UserMixin):
    """Safe user representation; password hashes never reach this object."""

    def __init__(self, id, username, role, disabled=False):
        self.id = int(id)
        self.username = username
        self.role = role
        self.disabled = bool(disabled)

    @property
    def is_active(self):
        return not self.disabled

    def to_dict(self):
        return {"id": self.id, "username": self.username, "role": self.role}
