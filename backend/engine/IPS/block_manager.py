import os
import sys


def block_ip(ip):
    if sys.platform == "win32":
        command = (
            f'netsh advfirewall firewall '
            f'add rule '
            f'name="Block {ip}" '
            f'dir=in '
            f'action=block '
            f'remoteip={ip}'
        )
        os.system(command)
    else:
        print(f"[STUB] block_ip({ip}) — netsh not available on {sys.platform}")
    print(f"[IPS BLOCKED] {ip}")