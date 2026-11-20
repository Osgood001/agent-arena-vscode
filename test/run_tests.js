'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const Module = require('module');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const store = require(path.join(ROOT, 'lib/store'));
const harnesses = require(path.join(ROOT, 'lib/harnesses'));
const isolator = require(path.join(ROOT, 'lib/isolator'));
const judge = require(path.join(ROOT, 'lib/judge'));
const markdown = require(path.join(ROOT, 'lib/markdown'));
const stats = require(path.join(ROOT, 'lib/stats'));
const { renderSidebarHtml } = require(path.join(ROOT, 'webview/sidebar'));
const { renderArenaHtml } = require(path.join(ROOT, 'webview/arena'));
const { renderAnalysisHtml } = require(path.join(ROOT, 'webview/analysis'));

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

async function main() {
  await test('1. harnesses.buildCommand, discoverLocalDefaults, getEffectivePresets, and pickTutorialConfigs', () => {
    const task = { prompt: 'Summarize README.md' };
    const base = {
      model: 'm1',
      effort: 'high',
      extraArgs: ['--foo'],
      workDir: '/tmp/work',
      lastMessagePath: '/tmp/last.txt',
      stdoutPath: '/tmp/out.log',
    };

    const cl = harnesses.buildCommand(
      { ...base, harness: 'claude' },
      task,
      { claudePermissionMode: 'acceptEdits', workspaceRoot: '/tmp/root-ws' },
    );
    assert.strictEqual(cl.args[cl.args.indexOf('--add-dir') + 1], '/tmp/root-ws');
    assert(cl.args.includes('-p'));
    assert(cl.args.includes('--verbose'));
    assert(cl.args.includes('stream-json'));
    assert.strictEqual(cl.args[cl.args.indexOf('--effort') + 1], 'high');
    assert.strictEqual(cl.args[cl.args.length - 1], 'Summarize README.md');

    const cx = harnesses.buildCommand({ ...base, harness: 'codex' }, task, { codexSandboxMode: 'workspace-write' });
    assert.strictEqual(cx.args[0], 'exec');
    assert(cx.args.includes('--skip-git-repo-check'));
    assert(cx.args.includes('--json'));
    assert(cx.args.includes('model_reasoning_effort=high'));
    assert(cx.args.includes('-o'));

    const oc = harnesses.buildCommand({ ...base, harness: 'opencode' }, task, { opencodeAuto: true });
    assert.strictEqual(oc.args[0], 'run');
    assert.strictEqual(oc.args[oc.args.indexOf('--variant') + 1], 'high');
    assert(oc.args.includes('--auto'));

    const pi = harnesses.buildCommand({ ...base, harness: 'pi' }, task, {});
    assert.strictEqual(pi.args[pi.args.indexOf('--thinking') + 1], 'high');
    assert(pi.args.includes('--mode'));

    const dsh = harnesses.buildCommand({ ...base, harness: 'dsh', model: 'headless' }, task, {});
    assert.deepStrictEqual(dsh.args.slice(0, 2), ['--profile', 'headless']);

    const cu = harnesses.buildCommand(
      { ...base, harness: 'custom', commandTemplate: 'cat {prompt_file}' },
      task,
      {},
    );
    assert(cu.promptFile && cu.command);

    const agyAcc = harnesses.buildCommand(
      { ...base, harness: 'agy' },
      task,
      { agyPermissionMode: 'accept-edits', workspaceRoot: '/tmp/root-ws' },
    );
    assert.strictEqual(agyAcc.args[agyAcc.args.indexOf('--add-dir') + 1], '/tmp/root-ws');
    assert.strictEqual(agyAcc.args[agyAcc.args.indexOf('--output-format') + 1], 'stream-json');
    assert.strictEqual(agyAcc.args[agyAcc.args.indexOf('--mode') + 1], 'accept-edits');
    assert.strictEqual(agyAcc.args[agyAcc.args.indexOf('--model') + 1], 'm1');
    assert.strictEqual(agyAcc.args[agyAcc.args.indexOf('--effort') + 1], 'high');
    assert.strictEqual(agyAcc.args[agyAcc.args.length - 1], '-p=Summarize README.md');

    const agySkip = harnesses.buildCommand(
      { ...base, harness: 'agy' },
      { prompt: '- leading dash' },
      { agyPermissionMode: 'dangerously-skip-permissions' },
    );
    assert(agySkip.args.includes('--dangerously-skip-permissions'));
    assert(!agySkip.args.includes('--mode'));
    assert.strictEqual(agySkip.args[agySkip.args.length - 1], '-p=- leading dash');

    const agyDef = harnesses.buildCommand({ ...base, harness: 'agy' }, task, { agyPermissionMode: 'default' });
    assert(!agyDef.args.includes('--mode'));
    assert(!agyDef.args.includes('--dangerously-skip-permissions'));
    assert(harnesses.buildChildEnv().PATH.includes(path.join('.gemini', 'bin')));

    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-home-'));
    try {
      fs.mkdirSync(path.join(fakeHome, '.codex'), { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, '.codex', 'config.toml'),
        'model = "o3-mini"\nmodel_reasoning_effort = "medium"\n[projects."/repo"]\nmodel = "ignored-section"\n',
        'utf8',
      );
      fs.mkdirSync(path.join(fakeHome, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, '.claude', 'settings.json'),
        JSON.stringify({ env: { ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4', SECRET_TOKEN: 'ignore' } }),
        'utf8',
      );
      fs.mkdirSync(path.join(fakeHome, '.gemini', 'antigravity-cli'), { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, '.gemini', 'antigravity-cli', 'settings.json'),
        JSON.stringify({ model: 'gemini-pro-test', effort: 'high' }),
        'utf8',
      );
      fs.mkdirSync(path.join(fakeHome, '.config', 'opencode'), { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, '.config', 'opencode', 'opencode.json'),
        JSON.stringify({ model: 'deepseek/deepseek-chat' }),
        'utf8',
      );
      fs.mkdirSync(path.join(fakeHome, '.pi', 'agent'), { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, '.pi', 'agent', 'settings.json'),
        JSON.stringify({ defaultProvider: 'anthropic', defaultModel: 'claude-haiku', defaultThinkingLevel: 'low' }),
        'utf8',
      );

      const defs = harnesses.discoverLocalDefaults(fakeHome);
      assert.strictEqual(defs.codex.model, 'o3-mini');
      assert.strictEqual(defs.codex.effort, 'medium');
      assert.strictEqual(defs.claude.model, 'claude-sonnet-4');
      assert.strictEqual(defs.agy.model, 'gemini-pro-test');
      assert.strictEqual(defs.agy.effort, 'high');
      assert.strictEqual(defs.opencode.model, 'deepseek/deepseek-chat');
      assert.strictEqual(defs.pi.model, 'anthropic/claude-haiku');
      assert.strictEqual(defs.pi.effort, 'low');

      const detected = {
        codex: { available: true },
        claude: { available: true },
        agy: { available: true },
        opencode: { available: true },
        pi: { available: false },
        dsh: { available: true },
      };
      const effPresets = harnesses.getEffectivePresets([], detected, fakeHome);
      assert(effPresets.some((p) => p.harness === 'codex' && p.model === 'o3-mini'));
      assert(effPresets.some((p) => p.harness === 'agy' && p.model === 'gemini-pro-test'));
      assert.strictEqual(effPresets[effPresets.length - 1].harness, 'pi'); // unavailable sorted last

      const customOverride = [{ label: 'Only Mine', harness: 'codex', model: 'm-custom', effort: 'high' }];
      assert.deepStrictEqual(harnesses.getEffectivePresets(customOverride, detected, fakeHome), customOverride);

      const tut = harnesses.pickTutorialConfigs(detected, fakeHome);
      assert.strictEqual(tut.length, 3);
      assert.deepStrictEqual(tut.map((x) => x.harness), ['codex', 'claude', 'opencode']);
      assert.strictEqual(tut[0].model, 'o3-mini');

      const tutWithAgy = harnesses.pickTutorialConfigs(
        { codex: { available: false }, claude: { available: true }, agy: { available: true }, opencode: { available: false }, pi: { available: false }, dsh: { available: false } },
        fakeHome,
      );
      assert.deepStrictEqual(tutWithAgy.map((x) => x.harness), ['claude', 'agy']);
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  await test('2. harnesses.createStreamParser handles Claude, Codex web_search, OpenCode, Pi, and DSH', () => {
    // Claude live turns + permission notice + authoritative result
    const pCl = harnesses.createStreamParser('claude');
    pCl.pushStdoutChunk(
      JSON.stringify({
        type: 'assistant',
        message: {
          usage: { input_tokens: 40, cache_read_input_tokens: 100, output_tokens: 20 },
          content: [
            { type: 'thinking', thinking: 'Check files' },
            { type: 'tool_use', name: 'Read', input: { file: 'a.txt' } },
          ],
        },
      }) + '\n' +
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', is_error: true, content: 'Claude requested permissions to use Bash, but you haven\'t granted it yet.' }],
        },
      }) + '\n',
    );
    const midCl = pCl.snapshot();
    assert.strictEqual(midCl.telemetry.numTurns, 1);
    assert.strictEqual(midCl.telemetry.totalTokens, 160);
    assert(midCl.feed.some((f) => f.kind === 'notice' && f.text.includes('claudePermissionMode')));

    pCl.pushStdoutChunk(
      JSON.stringify({
        type: 'result',
        result: 'Done!',
        num_turns: 3,
        total_cost_usd: 0.042,
        usage: {
          input_tokens: 100,
          cache_read_input_tokens: 800,
          cache_creation_input_tokens: 50,
          output_tokens: 200,
          output_tokens_details: { reasoning_tokens: 45 },
        },
      }) + '\n',
    );
    const rCl = pCl.finalize();
    assert.strictEqual(rCl.finalText, 'Done!');
    assert.strictEqual(rCl.telemetry.numTurns, 3);
    assert.strictEqual(rCl.telemetry.inputTokens, 950);
    assert.strictEqual(rCl.telemetry.cachedTokens, 800);
    assert.strictEqual(rCl.telemetry.outputTokens, 200);
    assert.strictEqual(rCl.telemetry.reasoningTokens, 45);
    assert.strictEqual(rCl.telemetry.totalTokens, 1150);
    assert.strictEqual(rCl.telemetry.costUsd, 0.042);

    // Codex web_search + command_execution + reasoning summary + reasoning_output_tokens + stdin banner filter
    const pCx = harnesses.createStreamParser('codex');
    pCx.pushStderrChunk('Reading additional input from stdin...\n');
    pCx.pushStdoutChunk(
      JSON.stringify({ type: 'item.started', item: { id: 'ws1', type: 'web_search', query: '', action: { type: 'other' } } }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'ws1', type: 'web_search', query: 'vscode api', action: { type: 'search', queries: ['vscode api'] } } }) + '\n' +
      JSON.stringify({ type: 'item.started', item: { id: 'cmd1', type: 'command_execution', command: 'ls' } }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'cmd1', type: 'command_execution', command: 'ls', exit_code: 0, aggregated_output: 'a.txt' } }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'fc1', type: 'function_call', name: 'lookup', arguments: { q: 'x' }, output: 'ok' } }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'rs1', type: 'reasoning', summary: [{ text: 'Thinking step' }] } }) + '\n' +
      JSON.stringify({ type: 'item.completed', item: { id: 'msg1', type: 'agent_message', text: 'Codex answer' } }) + '\n' +
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1000, cached_input_tokens: 700, output_tokens: 150, reasoning_output_tokens: 60 } }) + '\n',
    );
    const rCx = pCx.finalize();
    assert.strictEqual(rCx.finalText, 'Codex answer');
    assert.strictEqual(rCx.telemetry.toolCalls, 3); // web_search + command_execution + function_call
    assert.strictEqual(rCx.telemetry.totalTokens, 1150);
    assert.strictEqual(rCx.telemetry.reasoningTokens, 60);
    assert(rCx.feed.some((f) => f.kind === 'tool' && f.text.includes('web_search: vscode api')));
    assert(rCx.feed.some((f) => f.kind === 'thinking' && f.text === 'Thinking step'));
    assert(!rCx.feed.some((f) => f.text.includes('Reading additional input from stdin')));

    // OpenCode multi-step + error tool state
    const pOc = harnesses.createStreamParser('opencode');
    pOc.pushStdoutChunk(
      JSON.stringify({ type: 'step_start', part: { type: 'step-start' } }) + '\n' +
      JSON.stringify({ type: 'tool_use', part: { tool: 'bash', state: { status: 'error', input: { command: 'false' }, error: 'exit 1' } } }) + '\n' +
      JSON.stringify({ type: 'step_finish', part: { cost: 0.01, tokens: { input: 50, output: 30, cache: { read: 400, write: 10 }, reasoning: 12 } } }) + '\n' +
      JSON.stringify({ type: 'text', part: { text: 'OpenCode summary' } }) + '\n',
    );
    const rOc = pOc.finalize();
    assert.strictEqual(rOc.finalText, 'OpenCode summary');
    assert.strictEqual(rOc.telemetry.numTurns, 1);
    assert.strictEqual(rOc.telemetry.toolCalls, 1);
    assert.strictEqual(rOc.telemetry.inputTokens, 460);
    assert.strictEqual(rOc.telemetry.cachedTokens, 400);
    assert.strictEqual(rOc.telemetry.outputTokens, 30);
    assert.strictEqual(rOc.telemetry.reasoningTokens, 12);
    assert(rOc.feed.some((f) => f.kind === 'error' && f.text.includes('exit 1')));

    // Pi tool execution + message_end + agent_end fallback
    const pPi = harnesses.createStreamParser('pi');
    pPi.pushStdoutChunk(
      JSON.stringify({ type: 'tool_execution_start', toolName: 'read', args: { path: 'x.js' } }) + '\n' +
      JSON.stringify({ type: 'tool_execution_end', isError: false, result: 'contents' }) + '\n' +
      JSON.stringify({
        type: 'message_end',
        message: {
          role: 'assistant',
          content: '',
          usage: { input: 20, cacheRead: 80, cacheWrite: 5, output: 15, cost: { total: 0.005 } },
        },
      }) + '\n' +
      JSON.stringify({
        type: 'agent_end',
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Pi final answer' }] }],
      }) + '\n',
    );
    const rPi = pPi.finalize();
    assert.strictEqual(rPi.finalText, 'Pi final answer');
    assert.strictEqual(rPi.telemetry.toolCalls, 1);
    assert.strictEqual(rPi.telemetry.numTurns, 1);
    assert.strictEqual(rPi.telemetry.inputTokens, 105);
    assert.strictEqual(rPi.telemetry.cachedTokens, 80);
    assert.strictEqual(rPi.telemetry.outputTokens, 15);
    assert.strictEqual(rPi.telemetry.costUsd, 0.005);

    // DSH stderr filtering
    const pDsh = harnesses.createStreamParser('dsh');
    pDsh.pushStderrChunk('(node:123) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type\nReparsing as ES module\nReal stderr line\n');
    pDsh.pushStdoutChunk('Line 1\nLine 2\n');
    const rDsh = pDsh.finalize();
    assert.strictEqual(rDsh.finalText, 'Line 1\nLine 2');
    assert.strictEqual(rDsh.feed.filter((f) => f.kind === 'stderr').length, 1);
    assert.strictEqual(rDsh.feed.find((f) => f.kind === 'stderr').text, 'Real stderr line');

    // Antigravity (agy) NDJSON stream-json: streaming deltas, tool steps, cache+thinking tokens, denied_actions
    const pAgy = harnesses.createStreamParser('agy');
    pAgy.pushStdoutChunk(
      JSON.stringify({ event: 'init', conversation_id: 'c1', init: { cwd: '/tmp' } }) + '\n' +
      JSON.stringify({ event: 'step_update', step_update: { step_index: 1, state: 'ACTIVE', step_type: 'tool', tool_name: 'list_dir', tool_info: { name: 'list_dir', parameters: { path: '.' } } } }) + '\n' +
      JSON.stringify({ event: 'step_update', step_update: { step_index: 1, state: 'DONE', step_type: 'tool', tool_name: 'list_dir', tool_info: { output: 'ok' } } }) + '\n' +
      JSON.stringify({ event: 'step_update', step_update: { step_index: 2, state: 'ACTIVE', step_type: 'agent_response', text_delta: 'Hello ' } }) + '\n' +
      JSON.stringify({ event: 'step_update', step_update: { step_index: 2, state: 'ACTIVE', step_type: 'agent_response', text_delta: 'Antigravity' } }) + '\n',
    );
    const midAgy = pAgy.snapshot();
    assert.strictEqual(midAgy.finalText, 'Hello Antigravity');
    assert.strictEqual(midAgy.telemetry.toolCalls, 1);
    assert.strictEqual(midAgy.feed.filter((f) => f.kind === 'assistant').length, 1);

    pAgy.pushStdoutChunk(
      JSON.stringify({
        event: 'step_update',
        step_update: {
          step_index: 2,
          state: 'DONE',
          step_type: 'agent_response',
          text_delta: '!',
          usage: { input_tokens: 100, output_tokens: 20, thinking_tokens: 15, cache_read_tokens: 400 },
        },
      }) + '\n' +
      JSON.stringify({
        event: 'result',
        result: {
          status: 'SUCCESS',
          response: 'Hello Antigravity!\n',
          num_turns: 2,
          usage: { input_tokens: 150, output_tokens: 35, thinking_tokens: 25, cache_read_tokens: 500 },
          denied_actions: [{ action: 'command', display_name: 'Bash' }],
        },
      }) + '\n',
    );
    const rAgy = pAgy.finalize();
    assert.strictEqual(rAgy.finalText, 'Hello Antigravity!');
    assert.strictEqual(rAgy.telemetry.toolCalls, 1);
    assert.strictEqual(rAgy.telemetry.numTurns, 2);
    assert.strictEqual(rAgy.telemetry.inputTokens, 650);
    assert.strictEqual(rAgy.telemetry.cachedTokens, 500);
    assert.strictEqual(rAgy.telemetry.outputTokens, 35);
    assert.strictEqual(rAgy.telemetry.reasoningTokens, 25);
    assert.strictEqual(rAgy.telemetry.totalTokens, 685);
    assert(rAgy.feed.some((f) => f.kind === 'notice' && f.text.includes('agyPermissionMode')));
  });

  await test('3. isolator supports async CoW clone, heavy-dir/budget symlinks, scratch, direct manifest, and adoptWinner', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-iso-'));
    try {
      const ws = path.join(tmp, 'ws');
      fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'node_modules'), { recursive: true });
      fs.writeFileSync(path.join(ws, 'src', 'app.txt'), 'hello\n', 'utf8');
      fs.writeFileSync(path.join(ws, 'src', 'old.txt'), 'remove me\n', 'utf8');
      fs.writeFileSync(path.join(ws, 'node_modules', 'giant.bin'), 'should-be-symlinked', 'utf8');

      // Exceed entry budget auto-symlink test (>250 files without being in named heavy list)
      fs.mkdirSync(path.join(ws, 'many_files'), { recursive: true });
      for (let i = 0; i < 260; i += 1) {
        fs.writeFileSync(path.join(ws, 'many_files', `f-${i}.txt`), 'x', 'utf8');
      }

      const task = store.createTask(ws, {
        title: 'Iso test',
        prompt: 'Edit files',
        isolationMode: 'apfs-cow',
        configs: [
          { harness: 'custom', model: 'mA', effort: 'low', commandTemplate: 'echo A' },
          { harness: 'custom', model: 'mB', effort: 'high', commandTemplate: 'echo B' },
        ],
      });

      await isolator.prepareTaskEnvironment(ws, task);
      assert(fs.lstatSync(path.join(task.baselineDir, 'node_modules')).isSymbolicLink(), 'node_modules dir must be symlinked');
      assert(fs.lstatSync(path.join(task.baselineDir, 'many_files')).isSymbolicLink(), 'large dir exceeding budget must be symlinked');
      assert(!fs.existsSync(path.join(task.baselineDir, '.agent-arena')), '.agent-arena must be excluded');

      const w0 = task.candidates[0].workDir;
      const w1 = task.candidates[1].workDir;
      fs.writeFileSync(path.join(w0, 'src', 'app.txt'), 'hello world\n', 'utf8');
      fs.writeFileSync(path.join(w0, 'src', 'new.txt'), 'brand new\n', 'utf8');
      fs.unlinkSync(path.join(w0, 'src', 'old.txt'));
      assert.strictEqual(fs.readFileSync(path.join(w1, 'src', 'app.txt'), 'utf8'), 'hello\n');

      const diff0 = isolator.computeWorkspaceDiff(task.baselineDir, w0);
      assert.deepStrictEqual(diff0.added, ['src/new.txt']);
      assert.deepStrictEqual(diff0.modified, ['src/app.txt']);
      assert.deepStrictEqual(diff0.deleted, ['src/old.txt']);

      const adopted = isolator.adoptWinner(ws, w0, diff0);
      assert.deepStrictEqual(adopted.applied.sort(), ['src/app.txt', 'src/new.txt']);

      // Scratch mode
      const scratchTask = store.createTask(ws, {
        title: 'Scratch test',
        prompt: 'Write scratch report',
        isolationMode: 'scratch',
        configs: [{ harness: 'custom', model: 'mS', effort: '', commandTemplate: 'echo S' }],
      });
      await isolator.prepareTaskEnvironment(ws, scratchTask);
      const sw = scratchTask.candidates[0].workDir;
      assert(fs.lstatSync(path.join(sw, 'workspace')).isSymbolicLink(), 'scratch must symlink workspace');
      fs.writeFileSync(path.join(sw, 'report.md'), '# Report\n', 'utf8');
      const sDiff = isolator.computeWorkspaceDiff(null, sw);
      assert.deepStrictEqual(sDiff.added, ['report.md']);

      // Direct manifest skips node_modules heavy dir
      const before = isolator.snapshotDirectManifest(ws);
      assert(!Object.keys(before).some((k) => k.startsWith('node_modules/')));
      fs.writeFileSync(path.join(ws, 'src', 'direct.txt'), 'direct edit\n', 'utf8');
      const dChanges = isolator.computeDirectChanges(before, ws);
      assert.deepStrictEqual(dChanges.added, ['src/direct.txt']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('4. isolator git-worktree creates isolated detached worktrees, diffs changes, and cleans up', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-wt-'));
    try {
      const repo = path.join(tmp, 'repo');
      fs.mkdirSync(repo, { recursive: true });
      execFileSync('git', ['init'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.name', 'Arena Test'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo, stdio: 'pipe' });
      fs.writeFileSync(path.join(repo, 'index.js'), 'module.exports = 1;\n', 'utf8');
      execFileSync('git', ['add', 'index.js'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: repo, stdio: 'pipe' });

      const task = store.createTask(repo, {
        title: 'Worktree test',
        prompt: 'Bump constant',
        isolationMode: 'git-worktree',
        configs: [
          { harness: 'custom', model: 'a', effort: '', commandTemplate: 'echo a' },
          { harness: 'custom', model: 'b', effort: '', commandTemplate: 'echo b' },
        ],
      });

      await isolator.prepareTaskEnvironment(repo, task);
      assert(fs.existsSync(task.baselineDir));
      assert(fs.existsSync(task.candidates[0].workDir));

      fs.writeFileSync(path.join(task.candidates[0].workDir, 'index.js'), 'module.exports = 42;\n', 'utf8');
      const changes0 = isolator.computeWorkspaceDiff(task.baselineDir, task.candidates[0].workDir);
      const changes1 = isolator.computeWorkspaceDiff(task.baselineDir, task.candidates[1].workDir);
      assert.deepStrictEqual(changes0.modified, ['index.js']);
      assert.deepStrictEqual(changes1.modified, []);

      isolator.cleanupTaskWorktrees(repo, task);
      assert(!fs.existsSync(task.baselineDir), 'baseline worktree should be removed');
      assert(!fs.existsSync(task.candidates[0].workDir), 'candidate worktree should be removed');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('5. isolator computeJsUnifiedDiff, getUnifiedDiff binary/size guards, and path-traversal protection', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-diff-'));
    try {
      const base = path.join(tmp, 'base');
      const work = path.join(tmp, 'work');
      fs.mkdirSync(base, { recursive: true });
      fs.mkdirSync(work, { recursive: true });

      const jsDiffMod = isolator.computeJsUnifiedDiff('alpha\nbeta\ngamma\n', 'alpha\nbeta2\ngamma\ndelta\n', 'src/f.txt');
      assert(jsDiffMod.includes('--- a/src/f.txt'));
      assert(jsDiffMod.includes('+++ b/src/f.txt'));
      assert(jsDiffMod.includes('-beta'));
      assert(jsDiffMod.includes('+beta2'));
      assert(jsDiffMod.includes('+delta'));

      const jsDiffAdd = isolator.computeJsUnifiedDiff('', 'first\nsecond\n', 'new.txt');
      assert(jsDiffAdd.includes('@@ -0,0 +1,2 @@'));
      assert(jsDiffAdd.includes('+first'));

      const jsDiffDel = isolator.computeJsUnifiedDiff('gone\n', '', 'gone.txt');
      assert(jsDiffDel.includes('@@ -1,1 +0,0 @@'));
      assert(jsDiffDel.includes('-gone'));

      fs.writeFileSync(path.join(work, 'bin.dat'), Buffer.from([0x00, 0x01, 0x02]));
      assert(isolator.getUnifiedDiff(base, work, 'bin.dat').includes('[Binary file changed'));

      fs.writeFileSync(path.join(work, 'huge.txt'), 'a'.repeat(520 * 1024));
      assert(isolator.getUnifiedDiff(base, work, 'huge.txt').includes('exceeds 512 KB'));

      assert.throws(() => isolator.assertInsideDir(work, '../escape.txt'));
      assert.throws(() => isolator.assertInsideDir(work, '/etc/passwd'));
      assert.throws(() => isolator.getUnifiedDiff(base, work, '../../etc/passwd'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('6. harnesses.spawnCandidate executes custom process, captures non-zero failures, missing binaries, and cancels live processes', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-run-'));
    try {
      const ws = path.join(tmp, 'ws');
      fs.mkdirSync(ws, { recursive: true });

      const task = store.createTask(ws, {
        title: 'Spawn matrix',
        prompt: 'Test execution',
        isolationMode: 'direct',
        configs: [
          { harness: 'custom', model: 'ok', effort: '', commandTemplate: 'echo "done from custom"' },
          { harness: 'custom', model: 'fail', effort: '', commandTemplate: 'exit 7' },
          { harness: 'codex', model: 'missing', effort: '' },
          {
            harness: 'custom',
            model: 'slow',
            effort: '',
            commandTemplate: process.platform === 'win32' ? 'ping -n 30 127.0.0.1 >nul' : 'sleep 30',
          },
        ],
      });
      await isolator.prepareTaskEnvironment(ws, task);

      const resOk = await harnesses.spawnCandidate(task.candidates[0], task, { timeoutMinutes: 1 }).promise;
      assert.strictEqual(resOk.status, 'done');
      assert(resOk.finalText.includes('done from custom'));

      const resFail = await harnesses.spawnCandidate(task.candidates[1], task, { timeoutMinutes: 1 }).promise;
      assert.strictEqual(resFail.status, 'failed');
      assert.strictEqual(resFail.exitCode, 7);

      const resNoBin = await harnesses.spawnCandidate(task.candidates[2], task, {
        timeoutMinutes: 1,
        binaryOverrides: { codex: path.join(tmp, 'does-not-exist-codex') },
      }).promise;
      assert.strictEqual(resNoBin.status, 'failed');
      assert(resNoBin.error.includes('CLI binary not found'));

      const slowHandle = harnesses.spawnCandidate(task.candidates[3], task, { timeoutMinutes: 1 });
      setTimeout(() => slowHandle.cancel(), 120);
      const t0 = Date.now();
      const resCancel = await slowHandle.promise;
      assert.strictEqual(resCancel.status, 'cancelled');
      assert(Date.now() - t0 < 5000, 'Cancel should terminate child quickly');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('7. store validates taskIds, handles corrupt JSON, reconciles stale tasks, exports RFC-4180 CSV & JSON', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-store-'));
    try {
      const ws = path.join(tmp, 'ws');
      fs.mkdirSync(ws, { recursive: true });

      assert.throws(() => store.assertSafeTaskId('../evil'));
      assert.throws(() => store.assertSafeTaskId('a/b'));
      assert.throws(() => store.loadTask(ws, '../evil'));

      const t1 = store.createTask(ws, {
        title: 'CSV, "quoted"\ntitle',
        prompt: 'Check "quotes"',
        tags: ['perf', 'unit'],
        blindSeed: 777,
        configs: [
          { harness: 'codex', model: 'm1', effort: 'low' },
          { harness: 'claude', model: 'm2', effort: 'medium' },
        ],
      });
      // Deterministic blindMap
      const t1Clone = store.createTask(ws, {
        id: 'clone-task',
        title: 'Clone',
        prompt: 'Check "quotes"',
        blindSeed: 777,
        configs: [
          { harness: 'codex', model: 'm1', effort: 'low' },
          { harness: 'claude', model: 'm2', effort: 'medium' },
        ],
      });
      assert.strictEqual(
        Object.values(t1.blindMap).join(','),
        Object.values(t1Clone.blindMap).join(','),
      );

      t1.candidates[0].status = 'running';
      t1.candidates[0].telemetry = { ...store.emptyTelemetry(), inputTokens: 100, cachedTokens: 50, outputTokens: 25, reasoningTokens: 15, totalTokens: 125 };
      store.saveTask(ws, t1);

      const corruptPath = store.taskJsonPath(ws, 'clone-task');
      fs.writeFileSync(corruptPath, '{invalid json', 'utf8');
      assert.strictEqual(store.loadTask(ws, 'clone-task'), null);

      const reconciled = store.reconcileStaleTasks(ws, new Set());
      assert.strictEqual(reconciled, 1);
      assert.strictEqual(store.loadTask(ws, t1.id).candidates[0].status, 'interrupted');

      store.saveJudgment(ws, t1.id, {
        blindedWhenJudged: true,
        winnerId: t1.candidates[0].id,
        isTie: false,
        scores: { [t1.candidates[0].id]: { correctness: 5, clarity: 4, efficiency: 5 } },
        notes: 'Winner',
      });

      const reloaded = store.loadTask(ws, t1.id);
      const csv = store.exportTasksCsv([reloaded]);
      assert(csv.includes('reasoning_tokens'));
      assert(csv.includes('"CSV, ""quoted""\ntitle"'));
      assert(csv.includes(',15'));

      const parsedJson = JSON.parse(store.exportTasksJson([reloaded]));
      assert.strictEqual(parsedJson.taskCount, 1);
      assert.strictEqual(parsedJson.tasks[0].judgment.winnerId, t1.candidates[0].id);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('8. stats computes Wilson 95% CIs, bootstrap CIs, Bradley-Terry Elo, pairwise matrix, and filters', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-stats-'));
    try {
      const ws = path.join(tmp, 'ws');
      fs.mkdirSync(ws, { recursive: true });
      const cfgs = [
        { harness: 'codex', model: 'model-a', effort: 'high' },
        { harness: 'claude', model: 'model-b', effort: 'medium' },
      ];
      for (let i = 0; i < 4; i += 1) {
        const t = store.createTask(ws, {
          title: `Task ${i}`,
          prompt: `Prompt ${i}`,
          tags: [i < 3 ? 'daily' : 'other'],
          blindSeed: 100 + i,
          configs: cfgs,
        });
        t.candidates[0].status = 'done';
        t.candidates[0].durationMs = 10000 + i * 1000;
        t.candidates[0].telemetry = { inputTokens: 1000, cachedTokens: 600, outputTokens: 200, totalTokens: 1200, costUsd: 0.02, numTurns: 2, toolCalls: 1 };
        t.candidates[1].status = 'done';
        t.candidates[1].durationMs = 20000 + i * 1000;
        t.candidates[1].telemetry = { inputTokens: 2000, cachedTokens: 1000, outputTokens: 400, totalTokens: 2400, costUsd: 0.05, numTurns: 4, toolCalls: 3 };
        store.saveTask(ws, t);
        store.saveJudgment(ws, t.id, {
          blindedWhenJudged: true,
          winnerId: i === 3 ? null : (i < 2 ? t.candidates[0].id : t.candidates[1].id),
          isTie: i === 3,
          scores: {
            [t.candidates[0].id]: { correctness: 5, clarity: 4, efficiency: 5 },
            [t.candidates[1].id]: { correctness: 4, clarity: 4, efficiency: 3 },
          },
          notes: 'Eval',
        });
      }

      const tasks = store.listTasks(ws);
      const lbDaily = stats.computeLeaderboard(tasks, { tag: 'daily' });
      assert.strictEqual(lbDaily.totals.judgedTasks, 3);
      assert(lbDaily.configs[0].elo > lbDaily.configs[1].elo);
      assert(lbDaily.configs[0].winCi[0] >= 0 && lbDaily.configs[0].winCi[1] <= 1);

      const lbAll = stats.computeLeaderboard(tasks, { tag: 'other', harness: 'codex' });
      assert.strictEqual(lbAll.configs.length, 1);
      assert.strictEqual(lbAll.configs[0].ties, 1);

      const [p, lo, hi] = stats.wilsonCi(3, 4);
      assert(Math.abs(p - 0.75) < 1e-9);
      assert(lo < p && hi > p && lo >= 0 && hi <= 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('9. webviews have valid inline JS syntax, CSP nonces, light-theme overrides, and blind banner', () => {
    const fakeWebview = { cspSource: 'vscode-webview://test' };
    const htmlMap = {
      sidebar: renderSidebarHtml(fakeWebview),
      arena: renderArenaHtml(fakeWebview),
      analysis: renderAnalysisHtml(fakeWebview),
    };
    for (const [name, html] of Object.entries(htmlMap)) {
      assert(html.includes('Content-Security-Policy'));
      assert(html.includes('acquireVsCodeApi()'));
      assert(html.includes('body.vscode-light'));
      const m = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
      assert(m, `Missing script block in ${name}`);
      new vm.Script(m[1], { filename: `${name}.inline.js` });
    }
    assert(htmlMap.arena.includes('renderMarkdown('));
    assert(htmlMap.arena.includes('paneFilter'));
    assert(htmlMap.arena.includes('btnRerunTask'));
    assert(htmlMap.arena.includes('addModeHeader'));
    assert(htmlMap.arena.includes('value="agy"'));
    assert(htmlMap.analysis.includes('renderMarkdown('));
    assert(htmlMap.analysis.includes('Blind Mode Active'));
    assert(htmlMap.analysis.includes('btnCopyPrompt'));
    assert(htmlMap.analysis.includes('btnAddAgentToRun'));
    assert(htmlMap.analysis.includes('deepTelemetry'));
    assert(htmlMap.analysis.includes('deepStats'));
    assert(htmlMap.analysis.includes('btnRunAiJudge'));
  });

  await test('10. extension.js activates, handles webview messages, enforces delete confirmation & duplicate-launch lock, and deactivates', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-ext-'));
    const ws = tmp;
    try {
      const commands = new Map();
      const executedCmds = [];
      const warnings = [];
      const panels = [];
      const globalStore = new Map();
      let sidebarProviderRef = null;
      let warningReturn = 'Delete Run';

      const vscodeMock = {
        ViewColumn: { One: 1, Beside: 2 },
        StatusBarAlignment: { Left: 1, Right: 2 },
        Uri: { file: (p) => ({ fsPath: p }) },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: ws } }],
          getConfiguration: () => ({ get: () => undefined }),
          openTextDocument: async () => ({}),
        },
        window: {
          createStatusBarItem: () => ({ show: () => {}, dispose: () => {} }),
          registerWebviewViewProvider: (_id, prov) => {
            sidebarProviderRef = prov;
            return { dispose: () => {} };
          },
          createWebviewPanel: (_id, title) => {
            let msgHandler = null;
            const posted = [];
            const panel = {
              title,
              webview: {
                cspSource: 'vscode-webview://x',
                html: '',
                onDidReceiveMessage: (fn) => { msgHandler = fn; },
                postMessage: (m) => { posted.push(m); },
              },
              reveal: () => {},
              onDidDispose: () => {},
              _trigger: (m) => msgHandler && msgHandler(m),
              _posted: posted,
            };
            panels.push(panel);
            return panel;
          },
          showInformationMessage: async () => undefined,
          showWarningMessage: async (msg) => {
            warnings.push(msg);
            return warningReturn;
          },
          showErrorMessage: async () => undefined,
          showTextDocument: async () => undefined,
        },
        commands: {
          registerCommand: (id, fn) => { commands.set(id, fn); return { dispose: () => {} }; },
          executeCommand: async (id, arg) => { executedCmds.push([id, arg]); },
        },
      };

      const origLoad = Module._load;
      Module._load = function patched(request) {
        if (request === 'vscode') return vscodeMock;
        return origLoad.apply(this, arguments);
      };
      try {
        delete require.cache[require.resolve(path.join(ROOT, 'extension.js'))];
        const ext = require(path.join(ROOT, 'extension.js'));
        const ctx = {
          subscriptions: [],
          globalState: {
            get: (k) => globalStore.get(k),
            update: async (k, v) => globalStore.set(k, v),
          },
        };
        ext.activate(ctx);
        assert(sidebarProviderRef);
        assert(commands.has('agentArena.openArena'));
        assert(commands.has('agentArena.openAnalysis'));
        assert(commands.has('agentArena.startTutorial'));
        assert(commands.has('agentArena.cancelAll'));
        assert(commands.has('agentArena.exportData'));

        // Mount sidebar webview
        let sidebarMsgHandler = null;
        const sidebarPosted = [];
        sidebarProviderRef.resolveWebviewView({
          webview: {
            options: {},
            cspSource: 'vscode-webview://s',
            html: '',
            onDidReceiveMessage: (fn) => { sidebarMsgHandler = fn; },
            postMessage: (m) => { sidebarPosted.push(m); },
          },
          onDidDispose: () => {},
        });
        await sidebarMsgHandler({ type: 'ready' });
        assert(sidebarPosted.some((m) => m.type === 'state'));

        await sidebarMsgHandler({ type: 'openSettings' });
        assert(executedCmds.some(([c, a]) => c === 'workbench.action.openSettings' && a === 'agentArena'));

        // Open arena panel and trigger launchTask twice quickly -> duplicate-launch lock creates only 1 task
        commands.get('agentArena.openArena')();
        const arenaP = panels[0];
        await arenaP._trigger({ type: 'ready' });
        assert(arenaP._posted.some((m) => m.type === 'state'));

        const payload = {
          title: 'Lock check',
          prompt: 'echo once',
          isolationMode: 'direct',
          configs: [{ harness: 'custom', model: 'echo', effort: '', commandTemplate: 'echo hi' }],
        };
        await Promise.all([
          arenaP._trigger({ type: 'launchTask', payload }),
          arenaP._trigger({ type: 'launchTask', payload }),
        ]);
        const createdTasks = store.listTasks(ws);
        assert.strictEqual(createdTasks.length, 1, 'Duplicate launch within 3s window must be suppressed');

        // Delete confirmation cancellation vs approval
        warningReturn = undefined;
        await sidebarMsgHandler({ type: 'deleteTask', taskId: createdTasks[0].id });
        assert.strictEqual(store.listTasks(ws).length, 1, 'Cancelling modal must preserve task');

        warningReturn = 'Delete Run';
        await sidebarMsgHandler({ type: 'deleteTask', taskId: createdTasks[0].id });
        assert.strictEqual(store.listTasks(ws).length, 0, 'Confirming modal must delete task');
        assert(warnings.some((w) => w.includes('Lock check')));

        for (const sub of ctx.subscriptions) {
          if (sub && typeof sub.dispose === 'function') sub.dispose();
        }
        ext.deactivate();
      } finally {
        Module._load = origLoad;
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('11. public-hygiene static assertion finds zero private identifiers in repository files', () => {
    const banned = [
      ['dp-', 'kimi'].join(''),
      ['gpt-', '6.2'].join(''),
      ['osgood001', '.github.io'].join(''),
      ['/Users/', 'dp'].join(''),
      ['boh', 'rium'].join(''),
      ['\u6b27\u4ed5', '\u521a'].join(''),
    ];
    const filesToCheck = [
      path.join(ROOT, 'package.json'),
      path.join(ROOT, 'extension.js'),
      path.join(ROOT, 'lib/harnesses.js'),
      path.join(ROOT, 'lib/isolator.js'),
      path.join(ROOT, 'lib/judge.js'),
      path.join(ROOT, 'lib/markdown.js'),
      path.join(ROOT, 'lib/store.js'),
      path.join(ROOT, 'lib/stats.js'),
      path.join(ROOT, 'webview/common.js'),
      path.join(ROOT, 'webview/sidebar.js'),
      path.join(ROOT, 'webview/arena.js'),
      path.join(ROOT, 'webview/analysis.js'),
      path.join(ROOT, 'scripts/run_live_trial.js'),
      path.join(ROOT, 'scripts/verify_frontend_render.js'),
      path.join(ROOT, 'test/run_tests.js'),
    ];
    for (const fp of filesToCheck) {
      const content = fs.readFileSync(fp, 'utf8');
      for (const term of banned) {
        assert(
          !content.includes(term),
          `Public-hygiene check failed: forbidden term found in ${path.relative(ROOT, fp)}`,
        );
      }
    }
  });

  await test('12. lib/markdown.js renders GFM constructs safely and blocks XSS payloads', () => {
    const md = [
      '# Main Title',
      '',
      'Summary with **bold**, *italic*, ~~old~~, `inline_code`, and snake_case_var.',
      '',
      '- [x] Task done',
      '- [ ] Task pending',
      '  - Nested item',
      '',
      '1. First step',
      '2. Second step',
      '',
      '> Quoted insight',
      '',
      '| Module | Alignment | Status |',
      '| :--- | :---: | ---: |',
      '| `harnesses.js` | center | **ok** |',
      '',
      '```js',
      'const x = "**not bold**";',
      '<script>alert(1)</script>',
      '```',
      '',
      '[Safe Link](https://example.com/docs?a=1&b=2)',
      '[Bad JS](javascript:alert(1))',
      '[Bad Data](data:text/html,<script>alert(1)</script>)',
      '<img src=x onerror=alert(1)>',
    ].join('\n');

    const html = markdown.renderMarkdown(md);
    assert(html.includes('<h1>Main Title</h1>'));
    assert(html.includes('<strong>bold</strong>'));
    assert(html.includes('<em>italic</em>'));
    assert(html.includes('<del>old</del>'));
    assert(html.includes('<code>inline_code</code>'));
    assert(html.includes('snake_case_var') && !html.includes('<em>case</em>'));
    assert(html.includes('md-check checked'));
    assert(html.includes('<ul>') && html.includes('<ol>'));
    assert(html.includes('<blockquote>'));
    assert(html.includes('<table class="md-table">'));
    assert(html.includes('text-align:center'));
    assert(html.includes('text-align:right'));
    assert(html.includes('<div class="md-code-lang">js</div>'));
    assert(html.includes('const x = &quot;**not bold**&quot;;'));
    assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert(!html.includes('<script>'));
    assert(html.includes('href="https://example.com/docs?a=1&amp;b=2"'));
    assert(!html.includes('javascript:'));
    assert(!html.includes('data:text/html'));
    assert(!html.includes('<img '));
    assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));

    // Also verify standalone script function compiles independently (as injected in webviews)
    new vm.Script(`(${markdown.browserMarkdownScript()})("# Hi")`);
  });

  await test('13. lib/judge.js resolves configs, builds blind prompts with .md docs, parses JSON, and runs live agent judge', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-judge-'));
    try {
      const ws = path.join(tmp, 'ws');
      fs.mkdirSync(ws, { recursive: true });

      const task = store.createTask(ws, {
        title: 'Markdown Report Bench',
        prompt: 'Write a report',
        isolationMode: 'scratch',
        blindSeed: 42,
        configs: [
          { label: 'Codex · o3-mini', harness: 'codex', model: 'o3-mini', effort: 'low' },
          { label: 'Claude · claude-sonnet', harness: 'claude', model: 'claude-sonnet', effort: 'medium' },
        ],
      });
      await isolator.prepareTaskEnvironment(ws, task);
      task.candidates[0].status = 'done';
      task.candidates[0].durationMs = 4200;
      task.candidates[0].telemetry = { ...store.emptyTelemetry(), totalTokens: 500 };
      task.candidates[0].finalText = 'See `report.md`';
      task.candidates[0].changedFiles = { added: ['report.md'], modified: [], deleted: [] };
      fs.writeFileSync(path.join(task.candidates[0].workDir, 'report.md'), '# First Report\nClean findings.', 'utf8');

      task.candidates[1].status = 'done';
      task.candidates[1].durationMs = 6800;
      task.candidates[1].telemetry = { ...store.emptyTelemetry(), totalTokens: 900 };
      task.candidates[1].finalText = 'Second submission text.';
      store.saveTask(ws, task);

      // Blind prompt hides real harness/model labels and includes scratch report.md content
      const blindBuilt = judge.buildJudgePrompt(task, { blind: true, rubric: 'Prioritize clarity' });
      assert(blindBuilt.prompt.includes('Candidate A') && blindBuilt.prompt.includes('Candidate B'));
      assert(!blindBuilt.prompt.includes('o3-mini'));
      assert(!blindBuilt.prompt.includes('claude-sonnet'));
      assert(blindBuilt.prompt.includes('Prioritize clarity'));
      assert(blindBuilt.prompt.includes('# First Report'));

      // Non-blind prompt preserves labels
      const openBuilt = judge.buildJudgePrompt(task, { blind: false });
      assert(openBuilt.prompt.includes('Codex · o3-mini'));
      assert(openBuilt.prompt.includes('Claude · claude-sonnet'));

      // Fenced JSON + short letter key + score clamping
      const alias0 = task.blindMap[task.candidates[0].id];
      const alias1 = task.blindMap[task.candidates[1].id];
      const v1 = judge.parseJudgeOutput(
        `Analysis...\n\`\`\`json\n${JSON.stringify({
          winner: alias0,
          isTie: false,
          scores: {
            [alias0]: { correctness: 9, clarity: 4.5, efficiency: 5 },
            [alias1]: { correctness: 3, clarity: 3, efficiency: 2 },
          },
          rationale: 'Clear winner',
        })}\n\`\`\``,
        blindBuilt.aliasToCandId,
      );
      assert.strictEqual(v1.winnerId, task.candidates[0].id);
      assert.strictEqual(v1.isTie, false);
      assert.strictEqual(v1.scores[task.candidates[0].id].correctness, 5); // clamped
      assert.strictEqual(v1.notes, 'Clear winner');

      // Bare JSON fallback + Tie
      const vTie = judge.parseJudgeOutput(
        `Verdict: {"winner": null, "isTie": true, "scores": {"${alias0}": {"correctness": 4, "clarity": 4, "efficiency": 4}}, "rationale": "Even"}`,
        blindBuilt.aliasToCandId,
      );
      assert.strictEqual(vTie.isTie, true);
      assert.strictEqual(vTie.winnerId, null);

      assert.throws(() => judge.parseJudgeOutput('no json here', blindBuilt.aliasToCandId));

      // Live runAgentJudge using custom shell template
      const jsonOut = JSON.stringify({
        winner: alias1,
        isTie: false,
        scores: {
          [alias0]: { correctness: 3, clarity: 4, efficiency: 4 },
          [alias1]: { correctness: 5, clarity: 5, efficiency: 4 },
        },
        rationale: 'Second submission was more thorough.',
      });
      const b64 = Buffer.from(`\`\`\`json\n${jsonOut}\n\`\`\``, 'utf8').toString('base64');
      const liveHandle = judge.runAgentJudge(ws, task, {
        harness: 'custom',
        model: 'shell-judge',
        effort: '',
        blind: true,
        commandTemplate: `node -e "process.stdout.write(Buffer.from('${b64}','base64').toString('utf8'))"`,
      });
      const liveRes = await liveHandle.promise;
      assert.strictEqual(liveRes.judgmentInput.judgeType, 'agent');
      assert.strictEqual(liveRes.judgmentInput.winnerId, task.candidates[1].id);
      assert.strictEqual(liveRes.judgmentInput.notes, 'Second submission was more thorough.');

      const resolved = judge.resolveJudgeConfig({ harness: '' }, { harness: '' }, { claude: { available: false }, codex: { available: true } });
      assert.strictEqual(resolved.harness, 'codex');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('14. extension.js handles loadFileContent, traversal block, runAgentJudge, and saveJudgeConfig', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-v04-'));
    try {
      const ws = tmp;
      const updates = [];
      const panels = [];
      const commands = new Map();
      const globalStore = new Map();

      const vscodeMock = {
        ViewColumn: { One: 1, Beside: 2 },
        StatusBarAlignment: { Left: 1, Right: 2 },
        ConfigurationTarget: { Global: 1 },
        Uri: { file: (p) => ({ fsPath: p }) },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: ws } }],
          getConfiguration: () => ({
            get: () => undefined,
            update: async (k, v, t) => updates.push({ k, v, t }),
          }),
          openTextDocument: async () => ({}),
        },
        window: {
          createStatusBarItem: () => ({ show: () => {}, dispose: () => {} }),
          registerWebviewViewProvider: () => ({ dispose: () => {} }),
          createWebviewPanel: (_id, title) => {
            let msgHandler = null;
            const posted = [];
            const panel = {
              title,
              webview: {
                cspSource: 'vscode-webview://x',
                html: '',
                onDidReceiveMessage: (fn) => { msgHandler = fn; },
                postMessage: (m) => { posted.push(m); },
              },
              reveal: () => {},
              onDidDispose: () => {},
              _trigger: (m) => msgHandler && msgHandler(m),
              _posted: posted,
            };
            panels.push(panel);
            return panel;
          },
          showInformationMessage: async () => undefined,
          showWarningMessage: async () => undefined,
          showErrorMessage: async () => undefined,
          showTextDocument: async () => undefined,
        },
        commands: {
          registerCommand: (id, fn) => { commands.set(id, fn); return { dispose: () => {} }; },
          executeCommand: async () => undefined,
        },
      };

      const task = store.createTask(ws, {
        title: 'Extension v04 test',
        prompt: 'Generate markdown',
        isolationMode: 'scratch',
        configs: [
          { harness: 'custom', model: 'c1', effort: '', commandTemplate: 'echo 1' },
          { harness: 'custom', model: 'c2', effort: '', commandTemplate: 'echo 2' },
        ],
      });
      await isolator.prepareTaskEnvironment(ws, task);
      fs.writeFileSync(path.join(task.candidates[0].workDir, 'out.md'), '# Output\nHello', 'utf8');
      task.candidates[0].status = 'done';
      task.candidates[0].finalText = 'Done 1';
      task.candidates[1].status = 'done';
      task.candidates[1].finalText = 'Done 2';
      store.saveTask(ws, task);

      const origLoad = Module._load;
      Module._load = function patched(request) {
        if (request === 'vscode') return vscodeMock;
        return origLoad.apply(this, arguments);
      };
      try {
        delete require.cache[require.resolve(path.join(ROOT, 'extension.js'))];
        const ext = require(path.join(ROOT, 'extension.js'));
        const ctx = {
          subscriptions: [],
          globalState: {
            get: (k) => globalStore.get(k),
            update: async (k, v) => globalStore.set(k, v),
          },
        };
        ext.activate(ctx);

        commands.get('agentArena.openAnalysis')(task.id);
        const analysisP = panels[0];
        await analysisP._trigger({ type: 'ready' });
        assert(analysisP._posted.some((m) => m.type === 'state' && m.payload.judgeConfig));

        // loadFileContent returns .md content & blocks ../ traversal
        await analysisP._trigger({ type: 'loadFileContent', taskId: task.id, candId: task.candidates[0].id, relPath: 'out.md' });
        const okFileMsg = analysisP._posted.find((m) => m.type === 'fileContentLoaded' && m.payload.relPath === 'out.md');
        assert(okFileMsg && okFileMsg.payload.text.includes('# Output'));

        await analysisP._trigger({ type: 'loadFileContent', taskId: task.id, candId: task.candidates[0].id, relPath: '../../etc/passwd' });
        const errFileMsg = analysisP._posted.find((m) => m.type === 'fileContentLoaded' && m.payload.relPath === '../../etc/passwd');
        assert(errFileMsg && errFileMsg.payload.error);

        // saveJudgeConfig persists settings
        await analysisP._trigger({
          type: 'saveJudgeConfig',
          payload: { harness: 'claude', model: 'sonnet', effort: 'high', blind: false, rubric: 'Concise' },
        });
        assert(updates.some((u) => u.k === 'judge.harness' && u.v === 'claude'));
        assert(updates.some((u) => u.k === 'judge.rubric' && u.v === 'Concise'));

        // runAgentJudge executes and stores agent judgment
        const alias0 = task.blindMap[task.candidates[0].id];
        const b64 = Buffer.from(
          JSON.stringify({ winner: alias0, isTie: false, scores: { [alias0]: { correctness: 5, clarity: 5, efficiency: 5 } }, rationale: 'AI picked 0' }),
          'utf8',
        ).toString('base64');
        await analysisP._trigger({
          type: 'runAgentJudge',
          taskId: task.id,
          judgeConfig: {
            harness: 'custom',
            model: 'mock-judge',
            effort: '',
            blind: true,
            commandTemplate: `node -e "process.stdout.write(Buffer.from('${b64}','base64').toString('utf8'))"`,
          },
        });
        const judgedTask = store.loadTask(ws, task.id);
        assert(judgedTask.judgment);
        assert.strictEqual(judgedTask.judgment.judgeType, 'agent');
        assert.strictEqual(judgedTask.judgment.winnerId, task.candidates[0].id);
        assert.strictEqual(judgedTask.judgment.notes, 'AI picked 0');

        for (const sub of ctx.subscriptions) {
          if (sub && typeof sub.dispose === 'function') sub.dispose();
        }
        ext.deactivate();
      } finally {
        Module._load = origLoad;
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test('15. appendCandidates, prepareCandidatesEnvironment, stats judgedCandidateIds, and addCandidatesToTask flow', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-add-agent-'));
    try {
      // A. Isolated apfs-cow baseline preservation + appendCandidates blind map & leaderboard safety
      const wsCow = path.join(tmp, 'ws-cow');
      fs.mkdirSync(wsCow, { recursive: true });
      fs.writeFileSync(path.join(wsCow, 'note.txt'), 'v1\n', 'utf8');

      const cowTask = store.createTask(wsCow, {
        title: 'Existing CoW task',
        prompt: 'Inspect workspace',
        isolationMode: 'apfs-cow',
        blindSeed: 123,
        configs: [{ harness: 'custom', model: 'base-a', effort: '', commandTemplate: 'echo first' }],
      });
      await isolator.prepareTaskEnvironment(wsCow, cowTask);
      cowTask.candidates[0].status = 'done';
      cowTask.candidates[0].finalText = 'Original output';
      cowTask.finishedAt = new Date().toISOString();
      store.saveTask(wsCow, cowTask);
      store.saveJudgment(wsCow, cowTask.id, {
        judgeType: 'human',
        winnerId: cowTask.candidates[0].id,
        scores: { [cowTask.candidates[0].id]: { correctness: 5, clarity: 5, efficiency: 5 } },
        notes: 'Initial verdict',
      });

      const beforeBlind = { ...store.loadTask(wsCow, cowTask.id).blindMap };
      // Edit workspace after baseline was frozen; appended candidate must still receive v1 baseline!
      fs.writeFileSync(path.join(wsCow, 'note.txt'), 'v2-after-task\n', 'utf8');

      const { task: appendedCow, addedCandidates: cowAdded } = store.appendCandidates(wsCow, cowTask.id, [
        { harness: 'custom', model: 'added-b', effort: 'high', commandTemplate: 'echo second' },
      ]);
      assert.strictEqual(appendedCow.candidates.length, 2);
      assert.strictEqual(cowAdded.length, 1);
      assert.strictEqual(appendedCow.blindMap[cowTask.candidates[0].id], beforeBlind[cowTask.candidates[0].id]);
      assert.strictEqual(appendedCow.blindMap[cowAdded[0].id], 'Candidate B');
      assert(appendedCow.judgment && appendedCow.judgment.winnerId === cowTask.candidates[0].id);

      await isolator.prepareCandidatesEnvironment(wsCow, appendedCow, cowAdded);
      assert.strictEqual(fs.readFileSync(path.join(cowAdded[0].workDir, 'note.txt'), 'utf8'), 'v1\n');

      // Unjudged newly appended candidate must NOT be counted as a loss on the leaderboard yet
      const boardMid = stats.computeLeaderboard([appendedCow]);
      const rowA = boardMid.configs.find((c) => c.model === 'base-a');
      const rowB = boardMid.configs.find((c) => c.model === 'added-b');
      assert.strictEqual(rowA.wins, 1);
      assert.strictEqual(rowB.nRuns, 1);
      assert.strictEqual(rowB.nJudged, 0);
      assert.strictEqual(rowB.losses, 0);

      // B. Extension end-to-end: openArenaToAddAgent + addCandidatesToTask preserves cand 0 and runs ONLY cand 1
      const wsExt = path.join(tmp, 'ws-ext');
      fs.mkdirSync(wsExt, { recursive: true });
      const panels = [];
      const commands = new Map();
      const globalStore = new Map();
      const vscodeMock = {
        ViewColumn: { One: 1, Beside: 2 },
        StatusBarAlignment: { Left: 1, Right: 2 },
        Uri: { file: (p) => ({ fsPath: p }) },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: wsExt } }],
          getConfiguration: () => ({ get: () => undefined }),
          openTextDocument: async () => ({}),
        },
        window: {
          createStatusBarItem: () => ({ show: () => {}, dispose: () => {} }),
          registerWebviewViewProvider: () => ({ dispose: () => {} }),
          createWebviewPanel: (_id, title) => {
            let msgHandler = null;
            const posted = [];
            const panel = {
              title,
              webview: {
                cspSource: 'vscode-webview://x',
                html: '',
                onDidReceiveMessage: (fn) => { msgHandler = fn; },
                postMessage: (m) => { posted.push(m); },
              },
              reveal: () => {},
              onDidDispose: () => {},
              _trigger: (m) => msgHandler && msgHandler(m),
              _posted: posted,
            };
            panels.push(panel);
            return panel;
          },
          showInformationMessage: async () => undefined,
          showWarningMessage: async () => undefined,
          showErrorMessage: async () => undefined,
          showTextDocument: async () => undefined,
        },
        commands: {
          registerCommand: (id, fn) => { commands.set(id, fn); return { dispose: () => {} }; },
          executeCommand: async () => undefined,
        },
      };

      const seedTask = store.createTask(wsExt, {
        title: 'Existing investigation run',
        prompt: 'Analyze existing run',
        isolationMode: 'scratch',
        configs: [{ harness: 'custom', model: 'initial', effort: '', commandTemplate: 'echo SHOULD_NOT_RERUN' }],
      });
      await isolator.prepareTaskEnvironment(wsExt, seedTask);
      seedTask.candidates[0].status = 'done';
      seedTask.candidates[0].finalText = 'PRESERVED_CAND_0';
      seedTask.candidates[0].durationMs = 1234;
      seedTask.finishedAt = new Date().toISOString();
      store.saveTask(wsExt, seedTask);

      const origLoad = Module._load;
      Module._load = function patched(request) {
        if (request === 'vscode') return vscodeMock;
        return origLoad.apply(this, arguments);
      };
      try {
        delete require.cache[require.resolve(path.join(ROOT, 'extension.js'))];
        const ext = require(path.join(ROOT, 'extension.js'));
        const ctx = {
          subscriptions: [],
          globalState: {
            get: (k) => globalStore.get(k),
            update: async (k, v) => globalStore.set(k, v),
          },
        };
        ext.activate(ctx);

        commands.get('agentArena.openAnalysis')(seedTask.id);
        const analysisP = panels[0];
        await analysisP._trigger({ type: 'ready' });
        await analysisP._trigger({ type: 'openArenaToAddAgent', taskId: seedTask.id });

        const arenaP = panels[1];
        assert(arenaP, 'openArenaToAddAgent must open the Arena panel');
        await arenaP._trigger({ type: 'ready' });
        const openStateMsg = arenaP._posted.find((m) => m.type === 'state' && m.payload.openAddDrawer === true);
        assert(openStateMsg, 'Arena panel must receive openAddDrawer=true');

        await arenaP._trigger({
          type: 'addCandidatesToTask',
          taskId: seedTask.id,
          configs: [{
            harness: 'custom',
            model: 'late-comer',
            effort: 'low',
            commandTemplate: 'node -e "console.log(\'APPENDED_CAND_1_OK\')"',
          }],
        });

        const updatedTask = store.loadTask(wsExt, seedTask.id);
        assert.strictEqual(updatedTask.candidates.length, 2);
        assert.strictEqual(updatedTask.candidates[0].finalText, 'PRESERVED_CAND_0');
        assert.strictEqual(updatedTask.candidates[0].durationMs, 1234);
        assert.strictEqual(updatedTask.candidates[1].status, 'done');
        assert.strictEqual(updatedTask.candidates[1].finalText, 'APPENDED_CAND_1_OK');
        assert(updatedTask.finishedAt, 'Task finishedAt must be updated once appended candidate settles');

        for (const sub of ctx.subscriptions) {
          if (sub && typeof sub.dispose === 'function') sub.dispose();
        }
        ext.deactivate();
      } finally {
        Module._load = origLoad;
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  console.log(`\nALL ${passed} TESTS PASSED`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
