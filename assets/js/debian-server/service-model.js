export const createServices=()=>({
 'nginx.service':{description:'A high performance web server',active:true,enabled:true,pid:420},
 'ssh.service':{description:'OpenBSD Secure Shell server',active:true,enabled:true,pid:412},
 'cron.service':{description:'Regular background program processing daemon',active:true,enabled:true,pid:398},
 'systemd-journald.service':{description:'Journal Service',active:true,enabled:'static',pid:198},
 'dbus.service':{description:'D-Bus System Message Bus',active:true,enabled:'static',pid:405},
 'monitor.service':{description:'Lab status monitor',active:true,enabled:true,pid:455}
});
