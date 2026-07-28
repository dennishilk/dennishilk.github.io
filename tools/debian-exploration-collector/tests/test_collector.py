import http.client, json, os, sys, tempfile, threading, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))
import collector

def payload(commands=None):
    commands=commands or [("ls",1),("exit",10)]
    return {"schema_version":1,"duration_seconds":10,"commands":[{"command":c,"elapsed_seconds":e} for c,e in commands]}

class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/"statistics.json";self.store=collector.AggregateStore(self.path)
    def tearDown(self): self.tmp.cleanup()
    def test_empty_database_and_public_percentages(self):
        self.assertEqual(self.store.public()["completedSessions"],0)
        self.store.add(10,[("rm -rf /",1),("exit",10)]);self.store.add(20,[("ls",1),("exit",20)])
        data=self.store.public();self.assertEqual(data["completedSessions"],2);self.assertEqual(data["totalCommands"],4);self.assertEqual(next(x for x in data["themes"] if x["id"]=="dangerous")["percentage"],50)
    def test_normalization_strips_sensitive_arguments(self):
        cases={"ssh user@example.com":"ssh","curl https://example.com/private-token":"curl","export API_KEY=secret":"export","echo mypassword":"echo","cat /etc/os-release":"cat /etc/os-release","systemctl status nginx":"systemctl status nginx"}
        for raw,want in cases.items(): self.assertEqual(collector.normalize_command(raw),want)
    def test_validation(self):
        self.assertEqual(collector.validate_session(payload())[0],10)
        bad=payload();bad["schema_version"]=2
        with self.assertRaisesRegex(ValueError,"unsupported"):collector.validate_session(bad)
        bad=payload();bad["commands"]=[{"command":"ls","elapsed_seconds":1}]
        with self.assertRaisesRegex(ValueError,"completed"):collector.validate_session(bad)
        bad=payload();bad["commands"]=[{"command":"ls","elapsed_seconds":2},{"command":"exit","elapsed_seconds":1}]
        with self.assertRaises(ValueError):collector.validate_session(bad)
        bad=payload();bad["commands"]=[{"command":"ls","elapsed_seconds":0}]*501
        with self.assertRaisesRegex(ValueError,"count"):collector.validate_session(bad)
    def test_sequences_timing_and_atomic_persistence(self):
        entries=[("ls",1),("pwd",2),("rm -rf /",100),("exit",120)]
        self.store.add(120,entries);self.store.add(120,entries)
        data=self.store.public();self.assertEqual(data["completedSessions"],2);self.assertTrue(data["patterns"]);self.assertTrue(any("first two minutes" in x["text"] for x in data["observations"]))
        self.assertTrue(self.path.exists());self.assertEqual(list(self.path.parent.glob(".statistics-*")),[]);json.loads(self.path.read_text())
    def test_rate_limiter(self):
        limiter=collector.RateLimiter(2,60);self.assertTrue(limiter.allow());self.assertTrue(limiter.allow());self.assertFalse(limiter.allow())

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.server=collector.make_server("127.0.0.1",0,Path(cls.tmp.name)/"stats.json");cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.port=cls.server.server_port
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
    def request(self,method,path,body=None,ctype="application/json",headers=None):
        conn=http.client.HTTPConnection("127.0.0.1",self.port);h={"Content-Type":ctype};h.update(headers or {});conn.request(method,path,body,h);r=conn.getresponse();data=r.read();conn.close();return r.status,json.loads(data)
    def test_get_and_post_responses(self):
        status,data=self.request("GET","/api/debian-exploration/statistics");self.assertEqual(status,200);before=data["completedSessions"]
        status,data=self.request("POST","/api/debian-exploration/session",json.dumps(payload()));self.assertEqual((status,data),(202,{"accepted":True}))
        self.assertEqual(self.request("GET","/api/debian-exploration/statistics")[1]["completedSessions"],before+1)
    def test_malformed_incomplete_and_content_type(self):
        self.assertEqual(self.request("POST","/api/debian-exploration/session","{")[0],400)
        self.assertEqual(self.request("POST","/api/debian-exploration/session",json.dumps(payload()),"text/plain")[0],415)
        self.assertEqual(self.request("POST","/api/debian-exploration/session",json.dumps({**payload(),"commands":[{"command":"ls","elapsed_seconds":1}]}))[0],400)
    def test_excessive_body(self):
        status,_=self.request("POST","/api/debian-exploration/session","",headers={"Content-Length":str(collector.MAX_BODY+1)})
        self.assertEqual(status,413)

if __name__=="__main__":unittest.main()
