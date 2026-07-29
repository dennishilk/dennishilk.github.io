const SIMULATION_NOTE = ' The browser simulation does not affect a real computer.';

export const COMMAND_EXPLANATIONS = Object.freeze({
  'ls': 'The visitor wanted to see what files and directories were available.', 'ls -la': 'The visitor asked to see all files and directories, including hidden details.',
  'pwd': 'The visitor asked which directory they were in.', 'cd': 'The visitor changed the current directory.', 'mkdir': 'The visitor created a new directory.', 'touch': 'The visitor created an empty file or updated a file timestamp.',
  'cp': 'The visitor copied a file or directory.', 'mv': 'The visitor moved or renamed a file or directory.', 'rm': 'The visitor attempted to remove a file or directory.', 'rm -rf': 'The visitor attempted to remove files and directories recursively.',
  'rm -rf /': 'The visitor attempted to recursively remove the root filesystem.' + SIMULATION_NOTE, 'rm -rf --no-preserve-root /': 'The visitor attempted to recursively remove the root filesystem while disabling a safety check.' + SIMULATION_NOTE,
  'cat': 'The visitor asked to read a file.', 'less': 'The visitor opened text for paged viewing.', 'head': 'The visitor asked to see the beginning of some text.', 'tail': 'The visitor asked to see the end of some text.',
  'find': 'The visitor searched the simulated filesystem.', 'tree': 'The visitor asked to see directories arranged as a tree.', 'nano': 'The visitor opened the Nano text editor.', 'vim': 'The visitor opened the Vim text editor.', 'vi': 'The visitor opened the Vi text editor.',
  'file': 'The visitor asked the system to identify a file type.', 'stat': 'The visitor asked for detailed information about a file.', 'du': 'The visitor inspected how much storage files or directories used.', 'df': 'The visitor inspected available filesystem storage.',
  'uname': 'The visitor asked the system to identify its operating system.', 'uname -a': 'The visitor asked the system to identify itself and display kernel information.', 'hostname': 'The visitor asked for the system’s network name.', 'hostnamectl': 'The visitor inspected the system’s hostname and identity details.',
  'whoami': 'The visitor asked which user account the shell represented.', 'id': 'The visitor inspected the current user and group identities.', 'date': 'The visitor asked for the system date and time.', 'uptime': 'The visitor checked how long the system had been running.',
  'fastfetch': 'The visitor requested a concise overview of the simulated system.', 'neofetch': 'The visitor requested a concise overview of the simulated system.', 'cat /etc/os-release': 'The visitor inspected the operating system release information.', 'lsb_release': 'The visitor requested Linux distribution information.',
  'env': 'The visitor asked to see the shell environment.', 'printenv': 'The visitor asked to see the shell environment.',
  'ps': 'The visitor inspected running processes.', 'ps aux': 'The visitor requested a detailed list of running processes.', 'top': 'The visitor opened a live view of system activity.', 'htop': 'The visitor opened an interactive view of system activity.',
  'kill': 'The visitor attempted to signal a running process.', 'pkill': 'The visitor attempted to signal processes by name.', 'systemctl': 'The visitor attempted to inspect or manage a system service.', 'systemctl status': 'The visitor checked the status of a system service.', 'systemctl status nginx': 'The visitor checked the status of the nginx web service.',
  'service': 'The visitor attempted to inspect or manage a system service.', 'journalctl': 'The visitor inspected system service logs.', 'dmesg': 'The visitor inspected messages from the operating system kernel.',
  'sudo': 'The visitor attempted to run a command with administrator privileges.', 'su': 'The visitor attempted to switch user accounts.', 'chmod': 'The visitor attempted to change file permissions.', 'chown': 'The visitor attempted to change file ownership.',
  'passwd': 'The visitor attempted to change an account password.', 'useradd': 'The visitor attempted to add a user account.', 'adduser': 'The visitor attempted to add a user account.', 'apt': 'The visitor used Debian’s package manager.',
  'apt update': 'The visitor attempted to refresh package information.', 'apt upgrade': 'The visitor attempted to upgrade installed packages.', 'apt install': 'The visitor attempted to install a software package.', 'shutdown': 'The visitor attempted to shut the system down.' + SIMULATION_NOTE,
  'sudo shutdown': 'The visitor attempted to shut the system down with administrator privileges.' + SIMULATION_NOTE, 'sudo shutdown now': 'The visitor attempted to shut the system down immediately with administrator privileges.' + SIMULATION_NOTE,
  'reboot': 'The visitor attempted to restart the system.' + SIMULATION_NOTE, 'sudo reboot': 'The visitor attempted to restart the system with administrator privileges.' + SIMULATION_NOTE,
  'ip': 'The visitor inspected network configuration.', 'ip addr': 'The visitor inspected the system’s network addresses.', 'ip a': 'The visitor inspected the system’s network addresses.', 'ping': 'The visitor tested whether another network destination could be reached.',
  'traceroute': 'The visitor attempted to inspect the network path to a destination.', 'tracepath': 'The visitor attempted to inspect the network path to a destination.', 'curl': 'The visitor attempted to retrieve data from a network address.', 'wget': 'The visitor attempted to download data from a network address.',
  'ssh': 'The visitor attempted to connect to another computer using Secure Shell.', 'scp': 'The visitor attempted to copy data over a Secure Shell connection.', 'ss': 'The visitor inspected network connections and listening services.', 'netstat': 'The visitor inspected network connections and listening services.',
  'dig': 'The visitor queried the domain name system.', 'nslookup': 'The visitor queried the domain name system.', 'host': 'The visitor looked up a network name or address.',
  'echo': 'The visitor asked the shell to print text.', 'clear': 'The visitor cleared the terminal display.', 'history': 'The visitor asked to see recent shell commands.', 'grep': 'The visitor searched text for matching lines.', 'sort': 'The visitor asked the shell to arrange lines of text.',
  'uniq': 'The visitor asked the shell to identify adjacent repeated lines.', 'wc': 'The visitor asked the shell to count text.', 'cut': 'The visitor selected portions of each line of text.', 'sed': 'The visitor attempted to transform text.', 'awk': 'The visitor attempted to select or transform structured text.',
  'man': 'The visitor opened a command manual.', 'help': 'The visitor asked the shell for help.', 'which': 'The visitor asked where a command was installed.', 'whereis': 'The visitor searched for files associated with a command.', 'alias': 'The visitor inspected or defined a shell shortcut.',
  'export': 'The visitor attempted to define an environment variable.', 'exit': 'The visitor ended the simulated session.', 'logout': 'The visitor ended the simulated session.', 'other': 'The visitor entered a command outside the privacy-preserving command categories.'
});

const FAMILY_EXPLANATIONS = Object.freeze(Object.fromEntries(Object.entries(COMMAND_EXPLANATIONS).filter(([command]) => !command.includes(' '))));
export const UNKNOWN_COMMAND_EXPLANATION = 'The visitor entered a command outside the current museum explanation catalog.';

export function explainCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return UNKNOWN_COMMAND_EXPLANATION;
  const normalized = command.trim().toLowerCase().replace(/\s+/g, ' ');
  return COMMAND_EXPLANATIONS[normalized] || FAMILY_EXPLANATIONS[normalized.split(' ')[0]] || UNKNOWN_COMMAND_EXPLANATION;
}
