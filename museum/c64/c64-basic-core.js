(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.C64Basic = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  class BasicError extends Error {
    constructor(message, line, column) {
      super(message);
      this.name = "BasicError";
      this.basicMessage = message;
      this.line = line == null ? null : line;
      this.column = column == null ? null : column;
    }
  }

  function basicError(message, token) {
    throw new BasicError(message, null, token && token.position);
  }

  function formatError(error, line) {
    const atLine = line == null ? error.line : line;
    if (error.basicMessage === "BREAK") return "?BREAK" + (atLine == null ? "" : " IN " + atLine);
    return "?" + error.basicMessage + " ERROR" + (atLine == null ? "" : " IN " + atLine);
  }

  function canonicalVariable(name) {
    const upper = String(name || "").toUpperCase();
    const suffix = upper.endsWith("$") ? "$" : "";
    const base = upper.replace(/[$%]$/, "").replace(/[^A-Z0-9]/g, "");
    return base.slice(0, 2) + suffix;
  }

  function isStringVariable(name) {
    return String(name).endsWith("$");
  }

  class Tokenizer {
    constructor(source) {
      this.source = String(source || "");
      this.index = 0;
      this.tokens = [];
    }

    tokenize() {
      while (this.index < this.source.length) {
        const position = this.index;
        const character = this.source[this.index];
        if (/\s/.test(character)) {
          this.index += 1;
          continue;
        }
        if (character === "\"") {
          this.tokens.push(this.readString(position));
          continue;
        }
        if (/[0-9.]/.test(character) && (/[0-9]/.test(character) || /[0-9]/.test(this.source[this.index + 1] || ""))) {
          this.tokens.push(this.readNumber(position));
          continue;
        }
        if (/[A-Za-z]/.test(character)) {
          this.tokens.push(this.readIdentifier(position));
          continue;
        }
        const pair = this.source.slice(this.index, this.index + 2);
        if (pair === "<=" || pair === ">=" || pair === "<>") {
          this.tokens.push({ type: "operator", value: pair, position: position });
          this.index += 2;
          continue;
        }
        if ("+-*/^=<>".includes(character)) {
          this.tokens.push({ type: "operator", value: character, position: position });
          this.index += 1;
          continue;
        }
        if ("(),;:?".includes(character)) {
          this.tokens.push({ type: "punctuation", value: character, position: position });
          this.index += 1;
          continue;
        }
        basicError("SYNTAX", { position: position });
      }
      this.tokens.push({ type: "eof", value: "EOF", position: this.source.length });
      return this.tokens;
    }

    readString(position) {
      this.index += 1;
      let value = "";
      while (this.index < this.source.length && this.source[this.index] !== "\"") {
        value += this.source[this.index];
        this.index += 1;
      }
      if (this.source[this.index] !== "\"") basicError("SYNTAX", { position: position });
      this.index += 1;
      return { type: "string", value: value, position: position };
    }

    readNumber(position) {
      const remaining = this.source.slice(this.index);
      const match = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/i);
      if (!match) basicError("SYNTAX", { position: position });
      this.index += match[0].length;
      return { type: "number", value: Number(match[0]), position: position };
    }

    readIdentifier(position) {
      const remaining = this.source.slice(this.index);
      const match = remaining.match(/^[A-Za-z][A-Za-z0-9]*[$%]?/);
      this.index += match[0].length;
      return { type: "identifier", value: match[0].toUpperCase(), position: position };
    }
  }

  class Parser {
    constructor(source) {
      this.source = String(source || "");
      this.tokens = new Tokenizer(this.source).tokenize();
      this.index = 0;
    }

    current() {
      return this.tokens[this.index];
    }

    previous() {
      return this.tokens[this.index - 1];
    }

    at(value) {
      return this.current().value === value && this.current().type !== "string";
    }

    atType(type) {
      return this.current().type === type;
    }

    consume(value) {
      if (value != null && !this.at(value)) basicError("SYNTAX", this.current());
      const token = this.current();
      this.index += 1;
      return token;
    }

    match(value) {
      if (!this.at(value)) return false;
      this.index += 1;
      return true;
    }

    identifier(value) {
      return this.atType("identifier") && (value == null || this.current().value === value);
    }

    consumeIdentifier(value) {
      if (!this.identifier(value)) basicError("SYNTAX", this.current());
      return this.consume();
    }

    parse() {
      const statements = this.parseStatements();
      if (!this.at("EOF")) basicError("SYNTAX", this.current());
      return statements;
    }

    parseStatements() {
      const statements = [];
      while (!this.at("EOF")) {
        if (this.match(":")) continue;
        const statement = this.parseStatement();
        statements.push(statement);
        if (statement.type === "rem" || statement.type === "if") break;
        if (this.at("EOF")) break;
        this.consume(":");
      }
      return statements;
    }

    parseStatement() {
      if (this.match("?")) return this.parsePrint();
      if (this.identifier("PRINT")) {
        this.consume();
        return this.parsePrint();
      }
      if (this.identifier("LET")) {
        this.consume();
        return this.parseAssignment();
      }
      if (this.identifier("INPUT")) return this.parseInput();
      if (this.identifier("GET")) return this.parseGet();
      if (this.identifier("IF")) return this.parseIf();
      if (this.identifier("GOTO")) return this.parseLineTarget("goto");
      if (this.identifier("GOSUB")) return this.parseLineTarget("gosub");
      if (this.identifier("RETURN")) {
        this.consume();
        return { type: "return" };
      }
      if (this.identifier("FOR")) return this.parseFor();
      if (this.identifier("NEXT")) return this.parseNext();
      if (this.identifier("END")) {
        this.consume();
        return { type: "end" };
      }
      if (this.identifier("STOP")) {
        this.consume();
        return { type: "stop" };
      }
      if (this.identifier("REM")) {
        this.index = this.tokens.length - 1;
        return { type: "rem" };
      }
      if (this.identifier("DATA")) return this.parseData();
      if (this.identifier("READ")) return this.parseRead();
      if (this.identifier("RESTORE")) {
        this.consume();
        return { type: "restore" };
      }
      if (this.identifier("POKE")) return this.parsePoke();
      if (this.identifier("CLR")) {
        this.consume();
        return { type: "clr" };
      }
      if (this.atType("identifier")) return this.parseAssignment();
      basicError("SYNTAX", this.current());
    }

    parsePrint() {
      const items = [];
      if (this.at("EOF") || this.at(":")) return { type: "print", items: items, trailing: null };
      let trailing = null;
      while (!this.at("EOF") && !this.at(":")) {
        const expression = this.parseExpression();
        let separator = null;
        if (this.at(";") || this.at(",")) separator = this.consume().value;
        items.push({ expression: expression, separator: separator });
        trailing = separator;
        if (!separator) break;
        if (this.at("EOF") || this.at(":")) break;
      }
      return { type: "print", items: items, trailing: trailing };
    }

    parseAssignment() {
      const variable = this.consumeIdentifier().value;
      if (variable.endsWith("%")) basicError("SYNTAX", this.previous());
      this.consume("=");
      return { type: "assignment", variable: variable, expression: this.parseExpression() };
    }

    parseVariableList() {
      const variables = [];
      do {
        const variable = this.consumeIdentifier().value;
        if (variable.endsWith("%")) basicError("SYNTAX", this.previous());
        variables.push(variable);
      } while (this.match(","));
      return variables;
    }

    parseInput() {
      this.consumeIdentifier("INPUT");
      let prompt = null;
      if (this.atType("string")) {
        prompt = this.consume().value;
        if (!this.match(";") && !this.match(",")) basicError("SYNTAX", this.current());
      }
      return { type: "input", prompt: prompt, variables: this.parseVariableList() };
    }

    parseGet() {
      this.consumeIdentifier("GET");
      return { type: "get", variables: this.parseVariableList() };
    }

    parseIf() {
      this.consumeIdentifier("IF");
      const condition = this.parseExpression();
      this.consumeIdentifier("THEN");
      if (this.atType("number")) {
        const line = this.consume().value;
        if (!Number.isInteger(line)) basicError("SYNTAX", this.previous());
        this.index = this.tokens.length - 1;
        return { type: "if", condition: condition, target: line, then: [] };
      }
      const statements = this.parseStatements();
      return { type: "if", condition: condition, target: null, then: statements };
    }

    parseLineTarget(type) {
      this.consume();
      const token = this.consume();
      if (token.type !== "number" || !Number.isInteger(token.value)) basicError("SYNTAX", token);
      return { type: type, target: token.value };
    }

    parseFor() {
      this.consumeIdentifier("FOR");
      const variable = this.consumeIdentifier().value;
      if (variable.endsWith("$") || variable.endsWith("%")) basicError("TYPE MISMATCH", this.previous());
      this.consume("=");
      const start = this.parseExpression();
      this.consumeIdentifier("TO");
      const end = this.parseExpression();
      let step = { type: "literal", value: 1 };
      if (this.identifier("STEP")) {
        this.consume();
        step = this.parseExpression();
      }
      return { type: "for", variable: variable, start: start, end: end, step: step };
    }

    parseNext() {
      this.consumeIdentifier("NEXT");
      let variable = null;
      if (this.atType("identifier")) variable = this.consume().value;
      return { type: "next", variable: variable };
    }

    parseData() {
      this.consumeIdentifier("DATA");
      const values = [];
      while (!this.at("EOF") && !this.at(":")) {
        let sign = 1;
        if (this.match("-")) sign = -1;
        if (this.atType("number")) values.push(sign * this.consume().value);
        else if (sign === 1 && this.atType("string")) values.push(this.consume().value);
        else if (sign === 1 && this.atType("identifier")) values.push(this.consume().value);
        else basicError("SYNTAX", this.current());
        if (!this.match(",")) break;
      }
      return { type: "data", values: values };
    }

    parseRead() {
      this.consumeIdentifier("READ");
      return { type: "read", variables: this.parseVariableList() };
    }

    parsePoke() {
      this.consumeIdentifier("POKE");
      const address = this.parseExpression();
      this.consume(",");
      return { type: "poke", address: address, value: this.parseExpression() };
    }

    parseExpression() {
      return this.parseOr();
    }

    parseOr() {
      let expression = this.parseAnd();
      while (this.identifier("OR")) {
        this.consume();
        expression = { type: "binary", operator: "OR", left: expression, right: this.parseAnd() };
      }
      return expression;
    }

    parseAnd() {
      let expression = this.parseComparison();
      while (this.identifier("AND")) {
        this.consume();
        expression = { type: "binary", operator: "AND", left: expression, right: this.parseComparison() };
      }
      return expression;
    }

    parseComparison() {
      let expression = this.parseAdditive();
      if (["=", "<>", "<", ">", "<=", ">="].includes(this.current().value)) {
        const operator = this.consume().value;
        expression = { type: "binary", operator: operator, left: expression, right: this.parseAdditive() };
      }
      return expression;
    }

    parseAdditive() {
      let expression = this.parseMultiplicative();
      while (this.at("+") || this.at("-")) {
        const operator = this.consume().value;
        expression = { type: "binary", operator: operator, left: expression, right: this.parseMultiplicative() };
      }
      return expression;
    }

    parseMultiplicative() {
      let expression = this.parsePower();
      while (this.at("*") || this.at("/")) {
        const operator = this.consume().value;
        expression = { type: "binary", operator: operator, left: expression, right: this.parsePower() };
      }
      return expression;
    }

    parsePower() {
      let expression = this.parseUnary();
      if (this.match("^")) expression = { type: "binary", operator: "^", left: expression, right: this.parsePower() };
      return expression;
    }

    parseUnary() {
      if (this.at("+") || this.at("-")) {
        const operator = this.consume().value;
        return { type: "unary", operator: operator, expression: this.parseUnary() };
      }
      if (this.identifier("NOT")) {
        this.consume();
        return { type: "unary", operator: "NOT", expression: this.parseUnary() };
      }
      return this.parsePrimary();
    }

    parsePrimary() {
      const token = this.current();
      if (token.type === "number" || token.type === "string") {
        this.consume();
        return { type: "literal", value: token.value };
      }
      if (this.match("(")) {
        const expression = this.parseExpression();
        this.consume(")");
        return expression;
      }
      if (token.type === "identifier") {
        this.consume();
        if (this.match("(")) {
          const args = [];
          if (!this.at(")")) {
            do args.push(this.parseExpression());
            while (this.match(","));
          }
          this.consume(")");
          return { type: "call", name: token.value, args: args };
        }
        if (token.value.endsWith("%")) basicError("SYNTAX", token);
        return { type: "variable", name: token.value };
      }
      basicError("SYNTAX", token);
    }
  }

  class BasicProgram {
    constructor() {
      this.lines = new Map();
    }

    setLine(number, source) {
      number = Number(number);
      source = String(source || "").trimEnd();
      if (!Number.isInteger(number) || number < 0 || number > 63999) throw new BasicError("ILLEGAL QUANTITY");
      const full = String(number) + (source ? " " + source : "");
      if (full.length > 80) throw new BasicError("SYNTAX");
      const previous = this.lines.has(number) ? this.lines.get(number) : null;
      if (!source.trim()) this.lines.delete(number);
      else this.lines.set(number, source.trimStart());
      if (this.lines.size > 2000 || this.source().length > 65536) {
        if (previous == null) this.lines.delete(number);
        else this.lines.set(number, previous);
        throw new BasicError("OUT OF MEMORY");
      }
    }

    submit(source) {
      const match = String(source || "").match(/^\s*(\d+)(?:\s+(.*))?\s*$/);
      if (!match) return false;
      this.setLine(Number(match[1]), match[2] || "");
      return true;
    }

    clear() {
      this.lines.clear();
    }

    entries() {
      return Array.from(this.lines.entries()).sort(function (left, right) { return left[0] - right[0]; });
    }

    source() {
      return this.entries().map(function (entry) { return entry[0] + " " + entry[1]; }).join("\n");
    }

    load(source) {
      const next = new Map();
      const lines = String(source || "").replace(/\r/g, "").split("\n");
      if (String(source || "").length > 65536 || lines.length > 2000) throw new BasicError("OUT OF MEMORY");
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^\s*(\d+)(?:\s+(.*))?\s*$/);
        if (!match || !match[2]) throw new BasicError("SYNTAX");
        const number = Number(match[1]);
        const text = match[2];
        if (!Number.isInteger(number) || number < 0 || number > 63999 || line.trim().length > 80) throw new BasicError("SYNTAX");
        next.set(number, text);
      }
      this.lines = next;
    }

    list(spec) {
      spec = String(spec || "").trim();
      let minimum = 0;
      let maximum = 63999;
      if (spec) {
        let match = spec.match(/^(\d+)$/);
        if (match) minimum = maximum = Number(match[1]);
        else if ((match = spec.match(/^(\d+)-$/))) minimum = Number(match[1]);
        else if ((match = spec.match(/^-(\d+)$/))) maximum = Number(match[1]);
        else if ((match = spec.match(/^(\d+)-(\d+)$/))) {
          minimum = Number(match[1]);
          maximum = Number(match[2]);
        } else throw new BasicError("SYNTAX");
      }
      return this.entries().filter(function (entry) {
        return entry[0] >= minimum && entry[0] <= maximum;
      }).map(function (entry) {
        return entry[0] + " " + entry[1];
      });
    }
  }

  function collectData(statements, data) {
    for (const statement of statements) {
      if (statement.type === "data") data.push.apply(data, statement.values);
      if (statement.type === "if") collectData(statement.then || [], data);
    }
  }

  function compileStatements(statements, line, instructions) {
    for (const statement of statements) {
      if (statement.type === "if") {
        const guard = { type: "if-false", condition: statement.condition, targetIndex: null, line: line };
        instructions.push(guard);
        if (statement.target != null) instructions.push({ type: "goto", target: statement.target, line: line });
        else compileStatements(statement.then || [], line, instructions);
        guard.targetIndex = instructions.length;
      } else {
        const instruction = Object.assign({}, statement, { line: line });
        instructions.push(instruction);
      }
    }
  }

  function compileProgram(program) {
    const instructions = [];
    const lineTargets = new Map();
    const data = [];
    for (const entry of program.entries()) {
      const line = entry[0];
      try {
        const statements = new Parser(entry[1]).parse();
        lineTargets.set(line, instructions.length);
        collectData(statements, data);
        compileStatements(statements, line, instructions);
      } catch (error) {
        if (error instanceof BasicError) error.line = line;
        throw error;
      }
    }
    return { instructions: instructions, lineTargets: lineTargets, data: data };
  }

  function compileDirect(source) {
    const statements = new Parser(source).parse();
    const instructions = [];
    compileStatements(statements, null, instructions);
    return { instructions: instructions, lineTargets: new Map(), data: [] };
  }

  function numberValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new BasicError("TYPE MISMATCH");
    return value;
  }

  function stringValue(value) {
    if (typeof value !== "string") throw new BasicError("TYPE MISMATCH");
    return value;
  }

  function int16(value) {
    value = Math.trunc(numberValue(value));
    if (value < -32768 || value > 32767) throw new BasicError("ILLEGAL QUANTITY");
    return value;
  }

  function formatNumber(value) {
    value = numberValue(value);
    const rounded = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(10));
    return (rounded >= 0 ? " " : "") + String(rounded) + " ";
  }

  class BasicRuntime {
    constructor(options) {
      options = options || {};
      this.machine = options.machine;
      this.emit = typeof options.emit === "function" ? options.emit : function () {};
      this.now = typeof options.now === "function" ? options.now : function () {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
      };
      this.noProgressStatementsLimit = options.noProgressStatementsLimit || 20000;
      this.noProgressMsLimit = options.noProgressMsLimit || 2000;
      this.segmentStatementLimit = options.segmentStatementLimit || 100000;
      this.outputLineLimit = options.outputLineLimit || 2000;
      this.outputByteLimit = options.outputByteLimit || 65536;
      this.seed = options.seed == null ? 0x64c0ffee : options.seed >>> 0;
      this.lastRandom = 0.5;
      this.variables = new Map();
      this.resetExecution();
    }

    resetExecution() {
      this.instructions = [];
      this.lineTargets = new Map();
      this.data = [];
      this.dataIndex = 0;
      this.ip = 0;
      this.currentLine = null;
      this.gosubStack = [];
      this.forStack = [];
      this.inputQueue = "";
      this.pendingInput = null;
      this.status = "ready";
      this.pauseReason = null;
      this.noProgressStatements = 0;
      this.lastProgressAt = this.now();
      this.segmentStatements = 0;
      this.outputLines = 0;
      this.outputBytes = 0;
      this.outputLimited = false;
      this.metrics = {
        statements: 0,
        branches: 0,
        gosubs: 0,
        returns: 0,
        memoryWrites: 0,
        audioWrites: 0
      };
    }

    clearVariables() {
      this.variables.clear();
      this.gosubStack = [];
      this.forStack = [];
      this.dataIndex = 0;
    }

    loadCompiled(compiled, resetVariables) {
      this.resetExecution();
      if (resetVariables) this.variables.clear();
      this.instructions = compiled.instructions;
      this.lineTargets = compiled.lineTargets;
      this.data = compiled.data.slice();
      this.status = "running";
      this.emit({ type: "status", status: "running" });
    }

    startProgram(program) {
      this.loadCompiled(compileProgram(program), true);
    }

    startDirect(source) {
      const compiled = compileDirect(source);
      if (compiled.instructions.some(function (instruction) { return instruction.type === "input"; })) {
        throw new BasicError("ILLEGAL DIRECT");
      }
      this.loadCompiled(compiled, false);
    }

    markProgress() {
      this.noProgressStatements = 0;
      this.lastProgressAt = this.now();
    }

    random(argument) {
      argument = numberValue(argument);
      if (argument < 0) {
        this.seed = (Math.abs(Math.trunc(argument * 1000003)) || 1) >>> 0;
      } else if (argument === 0) {
        return this.lastRandom;
      }
      this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
      this.lastRandom = (this.seed + 1) / 4294967297;
      return this.lastRandom;
    }

    getVariable(name) {
      const key = canonicalVariable(name);
      if (!this.variables.has(key)) return isStringVariable(key) ? "" : 0;
      return this.variables.get(key);
    }

    setVariable(name, value) {
      const key = canonicalVariable(name);
      if (isStringVariable(key)) value = stringValue(value);
      else value = numberValue(value);
      this.variables.set(key, value);
      return value;
    }

    evaluate(expression) {
      if (expression.type === "literal") return expression.value;
      if (expression.type === "variable") return this.getVariable(expression.name);
      if (expression.type === "unary") {
        const value = this.evaluate(expression.expression);
        if (expression.operator === "+") return numberValue(value);
        if (expression.operator === "-") return -numberValue(value);
        if (expression.operator === "NOT") return ~int16(value);
      }
      if (expression.type === "binary") return this.evaluateBinary(expression);
      if (expression.type === "call") return this.evaluateCall(expression);
      throw new BasicError("SYNTAX");
    }

    evaluateBinary(expression) {
      const operator = expression.operator;
      const left = this.evaluate(expression.left);
      const right = this.evaluate(expression.right);
      if (operator === "+") {
        if (typeof left === "string" || typeof right === "string") return stringValue(left) + stringValue(right);
        return numberValue(left) + numberValue(right);
      }
      if (operator === "-") return numberValue(left) - numberValue(right);
      if (operator === "*") return numberValue(left) * numberValue(right);
      if (operator === "/") {
        if (numberValue(right) === 0) throw new BasicError("DIVISION BY ZERO");
        return numberValue(left) / right;
      }
      if (operator === "^") return Math.pow(numberValue(left), numberValue(right));
      if (operator === "AND") return int16(left) & int16(right);
      if (operator === "OR") return int16(left) | int16(right);
      if (["=", "<>", "<", ">", "<=", ">="].includes(operator)) {
        if (typeof left !== typeof right) throw new BasicError("TYPE MISMATCH");
        let result = false;
        if (operator === "=") result = left === right;
        else if (operator === "<>") result = left !== right;
        else if (operator === "<") result = left < right;
        else if (operator === ">") result = left > right;
        else if (operator === "<=") result = left <= right;
        else if (operator === ">=") result = left >= right;
        return result ? -1 : 0;
      }
      throw new BasicError("SYNTAX");
    }

    evaluateCall(expression) {
      const name = expression.name;
      const args = expression.args.map(this.evaluate.bind(this));
      if (name === "PEEK" && args.length === 1) {
        const address = Math.trunc(numberValue(args[0]));
        if (address < 0 || address > 65535) throw new BasicError("ILLEGAL QUANTITY");
        return this.machine.peek(address);
      }
      if (name === "INT" && args.length === 1) return Math.floor(numberValue(args[0]));
      if (name === "RND" && args.length === 1) return this.random(args[0]);
      if (name === "ABS" && args.length === 1) return Math.abs(numberValue(args[0]));
      if (name === "SGN" && args.length === 1) return Math.sign(numberValue(args[0]));
      if (name === "CHR$" && args.length === 1) {
        const code = Math.trunc(numberValue(args[0]));
        if (code < 0 || code > 255) throw new BasicError("ILLEGAL QUANTITY");
        return String.fromCharCode(code);
      }
      if (name === "ASC" && args.length === 1) {
        const value = stringValue(args[0]);
        if (!value.length) throw new BasicError("ILLEGAL QUANTITY");
        return value.charCodeAt(0) & 255;
      }
      if (name === "LEN" && args.length === 1) return stringValue(args[0]).length;
      if (name === "LEFT$" && args.length === 2) return stringValue(args[0]).slice(0, Math.max(0, Math.trunc(numberValue(args[1]))));
      if (name === "RIGHT$" && args.length === 2) {
        const count = Math.max(0, Math.trunc(numberValue(args[1])));
        return count ? stringValue(args[0]).slice(-count) : "";
      }
      if (name === "MID$" && (args.length === 2 || args.length === 3)) {
        const value = stringValue(args[0]);
        const start = Math.max(1, Math.trunc(numberValue(args[1]))) - 1;
        if (args.length === 2) return value.slice(start);
        return value.slice(start, start + Math.max(0, Math.trunc(numberValue(args[2]))));
      }
      if (name === "VAL" && args.length === 1) {
        const parsed = parseFloat(stringValue(args[0]).trim());
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (name === "STR$" && args.length === 1) return (numberValue(args[0]) >= 0 ? " " : "") + String(numberValue(args[0]));
      throw new BasicError("SYNTAX");
    }

    output(value, newline) {
      const rendered = String(value == null ? "" : value);
      const nextBytes = this.outputBytes + rendered.length + (newline ? 1 : 0);
      const nextLines = this.outputLines + (newline ? 1 : 0);
      if (nextBytes > this.outputByteLimit || nextLines > this.outputLineLimit) {
        if (!this.outputLimited) {
          this.outputLimited = true;
          this.machine.writeText("[OUTPUT TRUNCATED BY LAB SAFETY LIMIT]");
          this.emit({ type: "output-limit", lines: this.outputLines, bytes: this.outputBytes });
        }
        this.pause("output-limit");
        return;
      }
      this.outputBytes = nextBytes;
      this.outputLines = nextLines;
      this.machine.writeText(rendered, { newline: newline });
      this.markProgress();
    }

    jumpTo(line) {
      if (!this.lineTargets.has(line)) throw new BasicError("UNDEF'D STATEMENT");
      this.ip = this.lineTargets.get(line);
    }

    execute(instruction) {
      if (instruction.type === "if-false") {
        this.metrics.branches += 1;
        if (!numberValue(this.evaluate(instruction.condition))) this.ip = instruction.targetIndex;
        return;
      }
      if (instruction.type === "assignment") {
        this.setVariable(instruction.variable, this.evaluate(instruction.expression));
        return;
      }
      if (instruction.type === "print") {
        let text = "";
        let column = this.machine.cursor % 40;
        for (const item of instruction.items) {
          const value = this.evaluate(item.expression);
          const formatted = typeof value === "number" ? formatNumber(value) : value;
          text += formatted;
          column += String(formatted).length;
          if (item.separator === ",") {
            const spaces = 10 - (column % 10 || 10);
            text += " ".repeat(spaces || 10);
            column += spaces || 10;
          }
        }
        this.output(text, instruction.trailing == null);
        return;
      }
      if (instruction.type === "input") {
        this.pendingInput = instruction;
        this.status = "waiting-input";
        this.output((instruction.prompt == null ? "" : instruction.prompt) + "? ", false);
        this.emit({ type: "input-request", variables: instruction.variables.slice() });
        return;
      }
      if (instruction.type === "get") {
        for (const variable of instruction.variables) {
          const character = this.inputQueue ? this.inputQueue[0] : "";
          this.inputQueue = this.inputQueue.slice(character ? 1 : 0);
          if (isStringVariable(variable)) this.setVariable(variable, character);
          else this.setVariable(variable, /^\d$/.test(character) ? Number(character) : 0);
        }
        return;
      }
      if (instruction.type === "goto") {
        this.jumpTo(instruction.target);
        return;
      }
      if (instruction.type === "gosub") {
        this.gosubStack.push(this.ip);
        this.metrics.gosubs += 1;
        this.jumpTo(instruction.target);
        return;
      }
      if (instruction.type === "return") {
        if (!this.gosubStack.length) throw new BasicError("RETURN WITHOUT GOSUB");
        this.ip = this.gosubStack.pop();
        this.metrics.returns += 1;
        return;
      }
      if (instruction.type === "for") {
        const start = numberValue(this.evaluate(instruction.start));
        const end = numberValue(this.evaluate(instruction.end));
        const step = numberValue(this.evaluate(instruction.step));
        this.setVariable(instruction.variable, start);
        this.forStack.push({
          variable: canonicalVariable(instruction.variable),
          end: end,
          step: step,
          loopIp: this.ip
        });
        return;
      }
      if (instruction.type === "next") {
        if (!this.forStack.length) throw new BasicError("NEXT WITHOUT FOR");
        let index = this.forStack.length - 1;
        if (instruction.variable) {
          const wanted = canonicalVariable(instruction.variable);
          while (index >= 0 && this.forStack[index].variable !== wanted) index -= 1;
          if (index < 0) throw new BasicError("NEXT WITHOUT FOR");
          this.forStack.splice(index + 1);
        }
        const frame = this.forStack[index];
        const next = numberValue(this.getVariable(frame.variable)) + frame.step;
        this.setVariable(frame.variable, next);
        if ((frame.step >= 0 && next <= frame.end) || (frame.step < 0 && next >= frame.end)) this.ip = frame.loopIp;
        else this.forStack.splice(index, 1);
        return;
      }
      if (instruction.type === "end") {
        this.finish();
        return;
      }
      if (instruction.type === "stop") {
        throw new BasicError("BREAK", instruction.line);
      }
      if (instruction.type === "rem" || instruction.type === "data") return;
      if (instruction.type === "read") {
        for (const variable of instruction.variables) {
          if (this.dataIndex >= this.data.length) throw new BasicError("OUT OF DATA");
          this.setVariable(variable, this.data[this.dataIndex]);
          this.dataIndex += 1;
        }
        return;
      }
      if (instruction.type === "restore") {
        this.dataIndex = 0;
        return;
      }
      if (instruction.type === "poke") {
        let address = Math.trunc(numberValue(this.evaluate(instruction.address)));
        let value = Math.trunc(numberValue(this.evaluate(instruction.value)));
        if (address < 0 || address > 65535 || value < 0 || value > 255) throw new BasicError("ILLEGAL QUANTITY");
        this.machine.poke(address, value);
        this.metrics.memoryWrites += 1;
        if (address >= 54272 && address <= 54296) this.metrics.audioWrites += 1;
        this.markProgress();
        return;
      }
      if (instruction.type === "clr") {
        this.clearVariables();
        return;
      }
      throw new BasicError("SYNTAX");
    }

    step(maxStatements, maxMilliseconds) {
      maxStatements = maxStatements || 500;
      maxMilliseconds = maxMilliseconds == null ? 4 : maxMilliseconds;
      const started = this.now();
      let count = 0;
      if (this.status !== "running") return { count: 0, status: this.status };
      try {
        while (this.status === "running" && count < maxStatements) {
          if (this.ip >= this.instructions.length) {
            this.finish();
            break;
          }
          const instruction = this.instructions[this.ip];
          this.currentLine = instruction.line;
          this.ip += 1;
          this.execute(instruction);
          count += 1;
          this.metrics.statements += 1;
          this.segmentStatements += 1;
          this.noProgressStatements += 1;
          if (
            this.status === "running" &&
            (this.noProgressStatements >= this.noProgressStatementsLimit ||
              this.now() - this.lastProgressAt >= this.noProgressMsLimit)
          ) {
            this.pause("no-progress");
          } else if (this.status === "running" && this.segmentStatements >= this.segmentStatementLimit) {
            this.pause("statement-budget");
          }
          if (maxMilliseconds > 0 && this.now() - started >= maxMilliseconds) break;
        }
      } catch (error) {
        this.fail(error);
      }
      return { count: count, status: this.status };
    }

    provideInput(source) {
      if (this.status !== "waiting-input" || !this.pendingInput) return false;
      const values = String(source || "").split(",");
      if (values.length < this.pendingInput.variables.length) {
        this.output("?REDO FROM START", true);
        this.output((this.pendingInput.prompt == null ? "" : this.pendingInput.prompt) + "? ", false);
        return false;
      }
      try {
        this.pendingInput.variables.forEach(function (variable, index) {
          const raw = values[index].trim();
          if (isStringVariable(variable)) this.setVariable(variable, raw);
          else {
            const numeric = Number(raw);
            if (!Number.isFinite(numeric)) throw new BasicError("TYPE MISMATCH");
            this.setVariable(variable, numeric);
          }
        }, this);
      } catch (error) {
        this.output("?REDO FROM START", true);
        this.output((this.pendingInput.prompt == null ? "" : this.pendingInput.prompt) + "? ", false);
        return false;
      }
      this.pendingInput = null;
      this.status = "running";
      this.markProgress();
      this.emit({ type: "status", status: "running" });
      return true;
    }

    queueKeys(text) {
      this.inputQueue += String(text || "");
    }

    pause(reason) {
      this.status = "paused";
      this.pauseReason = reason;
      this.emit({ type: "pause", reason: reason, line: this.currentLine });
    }

    continueRun() {
      if (this.status !== "paused") return false;
      const previousReason = this.pauseReason;
      this.status = "running";
      this.pauseReason = null;
      this.segmentStatements = 0;
      this.noProgressStatements = 0;
      this.lastProgressAt = this.now();
      if (previousReason === "output-limit") {
        this.outputLines = 0;
        this.outputBytes = 0;
        this.outputLimited = false;
      }
      this.emit({ type: "status", status: "running" });
      return true;
    }

    stop(showBreak) {
      if (!["running", "paused", "waiting-input"].includes(this.status)) return false;
      if (showBreak !== false) this.machine.writeText(formatError(new BasicError("BREAK"), this.currentLine));
      this.status = "ready";
      this.pendingInput = null;
      this.emit({ type: "status", status: "ready", reason: "stopped" });
      return true;
    }

    finish() {
      if (this.status === "ready") return;
      this.status = "ready";
      this.machine.writeText("");
      this.machine.writeText("READY.");
      this.emit({ type: "status", status: "ready", reason: "complete" });
    }

    fail(error) {
      if (!(error instanceof BasicError)) {
        this.status = "internal-error";
        this.emit({ type: "internal-error", message: error && error.message ? error.message : "Unknown interpreter error" });
        return;
      }
      const line = error.line == null ? this.currentLine : error.line;
      this.machine.writeText(formatError(error, line));
      this.machine.writeText("");
      this.machine.writeText("READY.");
      this.status = "ready";
      this.pendingInput = null;
      this.emit({ type: "error", message: error.basicMessage, line: line, column: error.column });
      this.emit({ type: "status", status: "ready", reason: "error" });
    }

    state() {
      const variables = {};
      this.variables.forEach(function (value, key) { variables[key] = value; });
      return {
        status: this.status,
        pauseReason: this.pauseReason,
        currentLine: this.currentLine,
        variables: variables,
        metrics: Object.assign({}, this.metrics),
        segmentStatements: this.segmentStatements,
        outputLines: this.outputLines,
        outputBytes: this.outputBytes
      };
    }
  }

  class C64Session {
    constructor(options) {
      options = options || {};
      this.machine = options.machine;
      this.emit = typeof options.emit === "function" ? options.emit : function () {};
      this.program = new BasicProgram();
      this.runtime = new BasicRuntime({
        machine: this.machine,
        emit: this.emit,
        now: options.now,
        seed: options.seed,
        noProgressStatementsLimit: options.noProgressStatementsLimit,
        noProgressMsLimit: options.noProgressMsLimit,
        segmentStatementLimit: options.segmentStatementLimit
      });
      this.boot();
    }

    boot() {
      this.machine.reset();
      this.machine.writeText("**** COMMODORE 64 BASIC V2 ****");
      this.machine.writeText("");
      this.machine.writeText("64K RAM SYSTEM  38911 BASIC BYTES FREE");
      this.machine.writeText("");
      this.machine.writeText("READY.");
      this.emitState();
    }

    ready() {
      this.machine.writeText("READY.");
      this.emit({ type: "status", status: "ready" });
      this.emitState();
    }

    programChanged() {
      this.emit({ type: "program", source: this.program.source(), lines: this.program.entries().length });
    }

    submit(source) {
      source = String(source || "").replace(/\r?\n/g, "").toUpperCase();
      if (source.length > 80) {
        this.runtime.fail(new BasicError("SYNTAX"));
        return;
      }
      this.machine.writeText(source);
      if (this.runtime.status === "waiting-input") {
        this.runtime.provideInput(source);
        this.emitState();
        return;
      }
      try {
        if (this.program.submit(source)) {
          this.programChanged();
          this.ready();
          return;
        }
        const trimmed = source.trim();
        if (!trimmed) {
          this.ready();
          return;
        }
        let match = trimmed.match(/^LIST(?:\s+(.*))?$/);
        if (match) {
          const listed = this.program.list(match[1] || "");
          listed.forEach(function (line) { this.machine.writeText(line); }, this);
          this.ready();
          return;
        }
        if (trimmed === "RUN") {
          this.runtime.startProgram(this.program);
          this.emitState();
          return;
        }
        if (trimmed === "NEW") {
          this.runtime.stop(false);
          this.runtime.clearVariables();
          this.program.clear();
          this.programChanged();
          this.ready();
          return;
        }
        if (trimmed === "CLR") {
          this.runtime.clearVariables();
          this.ready();
          return;
        }
        if (trimmed === "STOP") {
          this.runtime.stop(true);
          this.ready();
          return;
        }
        this.runtime.startDirect(trimmed);
        this.emitState();
      } catch (error) {
        this.runtime.fail(error);
      }
    }

    loadSource(source) {
      try {
        this.runtime.stop(false);
        this.program.load(source);
        this.programChanged();
        this.emitState();
        return true;
      } catch (error) {
        this.runtime.fail(error);
        return false;
      }
    }

    resetMachine() {
      this.runtime.stop(false);
      this.runtime.clearVariables();
      this.boot();
      this.programChanged();
    }

    stop() {
      const stopped = this.runtime.stop(true);
      this.emitState();
      return stopped;
    }

    continueRun() {
      const continued = this.runtime.continueRun();
      this.emitState();
      return continued;
    }

    step(maxStatements, maxMilliseconds) {
      const result = this.runtime.step(maxStatements, maxMilliseconds);
      this.emitState();
      return result;
    }

    queueKeys(text) {
      this.runtime.queueKeys(text);
    }

    emitState() {
      this.emit({
        type: "runtime",
        runtime: this.runtime.state(),
        source: this.program.source()
      });
    }

    state() {
      return {
        runtime: this.runtime.state(),
        source: this.program.source()
      };
    }
  }

  return {
    BasicError: BasicError,
    BasicProgram: BasicProgram,
    BasicRuntime: BasicRuntime,
    C64Session: C64Session,
    Parser: Parser,
    Tokenizer: Tokenizer,
    canonicalVariable: canonicalVariable,
    compileProgram: compileProgram,
    compileDirect: compileDirect,
    formatError: formatError
  };
});
