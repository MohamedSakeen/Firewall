offense_counter = {}

def register_offense(ip):
    offense_counter[ip] = (
        offense_counter.get(ip, 0) + 1
    )
    return offense_counter[ip]
def calculate_ban_duration(offenses):
    return offenses * 300