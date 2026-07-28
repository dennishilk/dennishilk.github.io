#!/usr/bin/env python3
"""Privacy-preserving aggregate collector for the Debian exploration exhibit."""
from __future__ import annotations
import argparse, json, os, re, tempfile, threading, time
from collections import Counter, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCHEMA_VERSION = 1
MAX_BODY = 32_768
MAX_DURATION = 8 * 60 * 60
MAX_COMMANDS = 500
MAX_COMMAND_LENGTH = 256
RATE_WINDOW = 60
RATE_MAX = 30

THEMES = [
 ("system", "Operating System Identification", "wanted to identify the operating system", {"fastfetch","uname -a","hostnamectl","cat /etc/os-release"}),
 ("filesystem", "Filesystem Exploration", "explored the filesystem", {"ls","pwd","cd","tree","find","mkdir"}),
 ("administration", "Administrative Curiosity", "attempted administrative commands", {"sudo -l","sudo shutdown now","sudo su","su"}),
 ("network", "Network Exploration", "checked network connectivity", {"ping 1.1.1.1","ping google.com","curl example.com","wget example.com","ip addr","ss"}),
 ("dangerous", "Dangerous Commands", "attempted to remove the root directory", {"rm -rf /","rm -rf --no-preserve-root /"}),
 ("shutdown", "Shutdown Attempts", "attempted to shut the system down", {"shutdown now","sudo shutdown now","poweroff","reboot","halt","systemctl poweroff"}),
]
SAFE_EXACT = set().union(*(t[3] for t in THEMES)) | {"exit", "logout", "journalctl", "systemctl status nginx"}
SAFE_BASE = {"ls","pwd","cd","tree","find","mkdir","rmdir","touch","rm","cat","less","head","tail","fastfetch","uname","hostnamectl","ping","curl","wget","ip","ss","ssh","sudo","su","shutdown","poweroff","reboot","halt","systemctl","journalctl","export","echo","exit","logout"}

def normalize_command(value):
    """Lowercase/space-fold; retain museum allowlist patterns, otherwise only safe base."""
    if not isinstance(value, str) or not value or len(value) > MAX_COMMAND_LENGTH or any(ord(c) < 32 for c in value):
        raise ValueError("invalid command")
    normalized = re.sub(r"\s+", " ", value.strip()).lower()
    if not normalized: raise ValueError("invalid command")
    if normalized in SAFE_EXACT: return normalized
    base = normalized.split(" ", 1)[0]
    return base if base in SAFE_BASE else "other"

def validate_session(obj):
    if not isinstance(obj, dict) or set(obj) != {"schema_version", "duration_seconds", "commands"}: raise ValueError("invalid fields")
    if obj["schema_version"] != SCHEMA_VERSION: raise ValueError("unsupported schema version")
    duration = obj["duration_seconds"]
    if isinstance(duration, bool) or not isinstance(duration, (int,float)) or not 0 <= duration <= MAX_DURATION: raise ValueError("invalid duration")
    commands = obj["commands"]
    if not isinstance(commands, list) or not commands or len(commands) > MAX_COMMANDS: raise ValueError("invalid command count")
    result=[]; previous=-1
    for entry in commands:
        if not isinstance(entry, dict) or set(entry) != {"command","elapsed_seconds"}: raise ValueError("invalid command fields")
        elapsed=entry["elapsed_seconds"]
        if isinstance(elapsed,bool) or not isinstance(elapsed,(int,float)) or not 0 <= elapsed <= duration or elapsed < previous: raise ValueError("invalid command timing")
        previous=elapsed; result.append((normalize_command(entry["command"]), int(elapsed)))
    if result[-1][0] not in {"exit","logout"}: raise ValueError("session is not completed")
    return int(duration), result

def empty_state():
    return {"version":1,"completed_sessions":0,"total_commands":0,"total_duration_seconds":0,"longest_duration_seconds":0,"commands":{},"first":{},"final":{},"theme_visitors":{},"sequences":{},"root_attempts":0,"root_attempts_early":0}

def increment(mapping, key, amount=1): mapping[key] = mapping.get(key, 0) + amount

class AggregateStore:
    def __init__(self, path): self.path=Path(path); self.lock=threading.Lock()
    def load(self):
        try:
            data=json.loads(self.path.read_text()); base=empty_state(); base.update(data); return base
        except FileNotFoundError: return empty_state()
    def _write(self, state):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd,tmp=tempfile.mkstemp(prefix=".statistics-", dir=self.path.parent)
        try:
            with os.fdopen(fd,"w") as f: json.dump(state,f,separators=(",",":"),sort_keys=True); f.flush(); os.fsync(f.fileno())
            os.replace(tmp,self.path)
            dfd=os.open(self.path.parent,os.O_DIRECTORY)
            try: os.fsync(dfd)
            finally: os.close(dfd)
        finally:
            if os.path.exists(tmp): os.unlink(tmp)
    def add(self, duration, entries):
        with self.lock:
            s=self.load(); commands=[x[0] for x in entries]
            s["completed_sessions"]+=1; s["total_commands"]+=len(commands); s["total_duration_seconds"]+=duration
            s["longest_duration_seconds"]=max(s["longest_duration_seconds"],duration)
            for command in commands: increment(s["commands"],command)
            increment(s["first"],commands[0]); increment(s["final"],commands[-1])
            for ident,_,_,members in THEMES:
                if any(c in members for c in commands): increment(s["theme_visitors"],ident)
            compact=[c for i,c in enumerate(commands) if not i or c != commands[i-1]]
            for length in range(3,6):
                for i in range(len(compact)-length+1): increment(s["sequences"],"\x1f".join(compact[i:i+length]))
            roots=[elapsed for command,elapsed in entries if command in {"rm -rf /","rm -rf --no-preserve-root /"}]
            if roots: s["root_attempts"]+=1; s["root_attempts_early"] += min(roots) <= 120
            self._write(s)
    def public(self): return public_statistics(self.load())

def ranked(mapping): return sorted(mapping.items(),key=lambda x:(-x[1],x[0]))
def public_statistics(s):
    total=s["completed_sessions"]
    themes=[]
    for ident,title,description,members in THEMES:
        visitors=s["theme_visitors"].get(ident,0)
        themes.append({"id":ident,"title":title,"description":description,"visitors":visitors,"percentage":round(visitors*100/total) if total else 0,"common":[{"command":c,"count":s["commands"].get(c,0)} for c in sorted(members,key=lambda c:(-s["commands"].get(c,0),c)) if s["commands"].get(c)]})
    observations=[]
    if s["first"]: observations.append({"text":"The most common first command was ","command":ranked(s["first"])[0][0],"support":ranked(s["first"])[0][1]})
    if s["final"]: observations.append({"text":"The most common final command before exiting was ","command":ranked(s["final"])[0][0],"support":ranked(s["final"])[0][1]})
    if s["root_attempts"] and s["root_attempts_early"] > s["root_attempts"]/2: observations.append({"text":"Most visitors who attempted “rm -rf /” did so within the first two minutes.","support":s["root_attempts_early"]})
    return {"schemaVersion":1,"completedSessions":total,"totalCommands":s["total_commands"],"averageCommands":round(s["total_commands"]/total) if total else 0,"averageDurationMs":round(s["total_duration_seconds"]*1000/total) if total else 0,"longestDurationMs":s["longest_duration_seconds"]*1000,"commandFrequencies":[{"command":k,"count":v} for k,v in ranked(s["commands"])],"firstCommandFrequencies":[{"command":k,"count":v} for k,v in ranked(s["first"])],"finalCommandFrequencies":[{"command":k,"count":v} for k,v in ranked(s["final"])],"themes":themes,"observations":observations,"patterns":[{"commands":k.split("\x1f"),"count":v} for k,v in ranked(s["sequences"]) if v >= 2][:4]}

class RateLimiter:
    """Process-wide request cap; deliberately does not key or persist client addresses."""
    def __init__(self, maximum=RATE_MAX, window=RATE_WINDOW): self.maximum=maximum;self.window=window;self.events=deque();self.lock=threading.Lock()
    def allow(self):
        now=time.monotonic()
        with self.lock:
            while self.events and self.events[0] <= now-self.window: self.events.popleft()
            if len(self.events)>=self.maximum:return False
            self.events.append(now);return True

class Handler(BaseHTTPRequestHandler):
    store=None; limiter=None
    def log_message(self, format, *args): pass
    def reply(self,status,payload):
        body=json.dumps(payload,separators=(",",":")).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(body)
    def do_GET(self):
        if self.path != "/api/debian-exploration/statistics": return self.reply(404,{"error":"not found"})
        self.reply(200,self.store.public())
    def do_POST(self):
        if self.path != "/api/debian-exploration/session": return self.reply(404,{"error":"not found"})
        if not self.limiter.allow(): return self.reply(429,{"error":"rate limit exceeded"})
        if self.headers.get_content_type() != "application/json": return self.reply(415,{"error":"application/json required"})
        try: length=int(self.headers.get("Content-Length","-1"))
        except ValueError: length=-1
        if length < 0 or length > MAX_BODY: return self.reply(413,{"error":"request body too large"})
        try: obj=json.loads(self.rfile.read(length));duration,commands=validate_session(obj);self.store.add(duration,commands)
        except (ValueError,UnicodeDecodeError,json.JSONDecodeError): return self.reply(400,{"error":"invalid completed session"})
        self.reply(202,{"accepted":True})

def make_server(host,port,state):
    handler=type("ConfiguredHandler",(Handler,),{"store":AggregateStore(state),"limiter":RateLimiter()})
    return ThreadingHTTPServer((host,port),handler)
def main():
    p=argparse.ArgumentParser();p.add_argument("--host",default="127.0.0.1");p.add_argument("--port",type=int,default=8765);p.add_argument("--state",default="/var/lib/debian-exploration/statistics.json");a=p.parse_args()
    make_server(a.host,a.port,a.state).serve_forever()
if __name__ == "__main__": main()
