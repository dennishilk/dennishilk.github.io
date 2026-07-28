export const createProcesses=()=>[
 {pid:1,user:'root',cpu:0.0,mem:0.6,command:'/sbin/init',name:'systemd',protected:true,service:null},
 {pid:198,user:'root',cpu:0.0,mem:1.1,command:'/usr/lib/systemd/systemd-journald',name:'systemd-journald',protected:true,service:'systemd-journald.service'},
 {pid:231,user:'root',cpu:0.0,mem:0.4,command:'/usr/lib/systemd/systemd-udevd',name:'systemd-udevd',protected:true},
 {pid:398,user:'root',cpu:0.0,mem:0.3,command:'/usr/sbin/cron -f',name:'cron',protected:true,service:'cron.service'},
 {pid:405,user:'messagebus',cpu:0.0,mem:0.2,command:'@dbus-daemon --system',name:'dbus-daemon',protected:true,service:'dbus.service'},
 {pid:412,user:'root',cpu:0.0,mem:0.5,command:'sshd: /usr/sbin/sshd -D',name:'sshd',protected:true,service:'ssh.service'},
 {pid:420,user:'root',cpu:0.0,mem:0.4,command:'nginx: master process /usr/sbin/nginx',name:'nginx',protected:true,service:'nginx.service'},
 {pid:421,user:'www-data',cpu:0.1,mem:0.7,command:'nginx: worker process',name:'nginx',protected:true,service:'nginx.service'},
 {pid:455,user:'monitor',cpu:0.1,mem:0.8,command:'/opt/monitor/monitor',name:'monitor',protected:true,service:'monitor.service'},
 {pid:530,user:'visitor',cpu:0.0,mem:0.9,command:'-bash',name:'bash',protected:false}
];
export const liveProcesses=s=>s.processes.filter(p=>!p.terminated);
