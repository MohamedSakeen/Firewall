import os
def block_ip(ip):
    command = (
        f'netsh advfirewall firewall'
        f'add rule'
        f'name="Block {ip}"'
        f'dir=in'
        f'action=block'
        f'remoteip={ip}'
    )
    os.system(command)
    print(f"[IPS BLOCKED] {ip}")