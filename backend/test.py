import os
ip = "192.168.1.100"
command = f'netsh advfirewall firewall add rule name="BlockIP" dir=in action=block remoteip={ip}'
os.system(command)