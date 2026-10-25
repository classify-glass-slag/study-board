// 学习看板：极简本地服务（无第三方依赖）
// 启动：node server.js     然后浏览器打开 http://127.0.0.1:3099
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = 3099;
const PLAN = path.join(ROOT, 'plan.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

// 记录"今天有过打卡动作"的日期（连续打卡天数由这些日期算出）
function touchCheckDates(plan) {
  const today = new Date().toLocaleDateString('sv-SE');
  plan.checkDates = plan.checkDates || [];
  if (!plan.checkDates.includes(today)) plan.checkDates.push(today);
  plan.checkDates = plan.checkDates.slice(-400);
}

function readPlan() {
  // 首次运行（仓库里没有 plan.json）时，用示例数据初始化
  if (!fs.existsSync(PLAN)) {
    const example = path.join(ROOT, 'plan.example.json');
    if (fs.existsSync(example)) fs.copyFileSync(example, PLAN);
  }
  return JSON.parse(fs.readFileSync(PLAN, 'utf8'));
}
function writePlan(plan) {
  plan.updatedAt = new Date().toLocaleString('zh-CN');
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2), 'utf8');
}
function ok(res) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end('{"ok":true}');
}
function fail(res) {
  res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end('{"ok":false}');
}

const server = http.createServer((req, res) => {
  // ① 切换打卡：kind = 'day'（日计划）或 'step'（月度挑战步骤）
  if (req.method === 'POST' && req.url === '/toggle') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { kind, index } = JSON.parse(body);
        const plan = readPlan();
        if (kind === 'step') {
          const steps = plan.monthlyChallenge && plan.monthlyChallenge.steps;
          if (steps && steps[index]) steps[index].done = !steps[index].done;
        } else if (kind === 'habit') {
          if (plan.habits && plan.habits[index]) plan.habits[index].done = !plan.habits[index].done;
        } else if (kind === 'todo') {
          if (plan.todos && plan.todos[index]) plan.todos[index].done = !plan.todos[index].done;
        } else {
          if (plan.days && plan.days[index]) plan.days[index].done = !plan.days[index].done;
          touchCheckDates(plan);                 // 记下今天打过卡
        }
        writePlan(plan);
        ok(res);
      } catch (e) { fail(res); }
    });
    return;
  }

  // ② 开新的一周：把本周存档、清空打卡、周次 +1
  if (req.method === 'POST' && req.url === '/newweek') {
    try {
      const plan = readPlan();
      const countable = (plan.days || []).filter((d) => d.countable);
      const done = countable.filter((d) => d.done).length;

      plan.history = plan.history || [];
      plan.history.unshift({
        weekNo: plan.weekNo || 1,
        weekStart: plan.weekStart || '',
        theme: plan.weekTheme || '',
        done: done,
        target: (plan.stats && plan.stats.targetProblems) || countable.length
      });
      plan.history = plan.history.slice(0, 16);      // 只留最近 16 周

      (plan.days || []).forEach((d) => { d.done = false; });
      plan.weekNo = (plan.weekNo || 1) + 1;
      plan.weekStart = new Date().toLocaleDateString('sv-SE');   // yyyy-mm-dd
      writePlan(plan);
      ok(res);
    } catch (e) { fail(res); }
    return;
  }

  // 动态返回计划（读取时顺便做跨天重置）
  if (req.method === 'GET' && req.url.split('?')[0] === '/plan') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(readPlan()));
    return;
  }

  const urlPath = req.url.split('?')[0];
  const file = urlPath === '/' ? 'dashboard.html' : decodeURIComponent(urlPath.slice(1));
  const full = path.join(ROOT, file);

  if (!full.startsWith(ROOT)) {           // 防目录穿越
    res.writeHead(403); res.end('forbidden'); return;
  }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`学习看板已启动： http://127.0.0.1:${PORT}`);
});
