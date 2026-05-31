const CSV_URL = "https://raw.githubusercontent.com/Kaua-Pietro/ProjetoPandas/refs/heads/main/populacao_estimada_2020.csv";
const H = 260; 

const CONFIG = {
  background: "transparent",
  axis: { 
    labelColor: "#8e95a5", 
    titleColor: "#8e95a5", 
    gridColor: "rgba(255,255,255,0.05)", 
    domainColor: "rgba(255,255,255,0.1)", 
    tickColor: "rgba(255,255,255,0.1)" 
  },
  legend: { 
    labelColor: "#8e95a5", 
    titleColor: "#8e95a5" 
  },
  view: { stroke: "transparent" },
  title: { color: "#e8eaf0" }
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  document.getElementById('page-' + id).classList.add('active');
  if(window.event) window.event.target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fmtNum(n) { return n.toLocaleString('pt-BR'); }

// Função da animação fluida dos cards
function animateCount(el, target, duration, formatter) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4); 
    const current = Math.floor(ease * target);
    el.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = formatter(target);
  }
  requestAnimationFrame(step);
}

async function loadData() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const si = headers.indexOf("state"), ci = headers.indexOf("city"), pi = headers.indexOf("estimated_population");
  
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    return { UF: vals[si], Municipio: vals[ci], Populacao: +vals[pi] };
  }).filter(d => d.Populacao > 0);
}

function embed(id, spec) { 
  spec.width = "container"; 
  vegaEmbed(id, spec, { defaultStyle: true }); 
}

function buildTable(tableEl, items, keyName, isUF = false) {
  if (!tableEl) return;
  let headers = isUF ? `<tr><th>Pos</th><th>Estado</th><th>População</th></tr>` : `<tr><th>Pos</th><th>Município</th><th>UF</th><th>População</th></tr>`;
  
  let rows = items.map((d, i) => {
    if(isUF) {
      return `<tr><td>${i + 1}</td><td>${d[keyName]}</td><td><strong>${fmtNum(d.Populacao)}</strong></td></tr>`;
    }
    return `<tr><td>${i + 1}</td><td>${d[keyName]}</td><td>${d.UF || '-'}</td><td><strong>${fmtNum(d.Populacao)}</strong></td></tr>`;
  }).join('');
  
  tableEl.innerHTML = `<thead>${headers}</thead><tbody>${rows}</tbody>`;
}

async function init() {
  const dados = await loadData();

  const totalPop = dados.reduce((s, d) => s + d.Populacao, 0);
  const totalMun = dados.length;
  const media = Math.round(totalPop / totalMun);

  const byUF = {};
  dados.forEach(d => { byUF[d.UF] = (byUF[d.UF] || 0) + d.Populacao; });
  const maiorUF = Object.entries(byUF).sort((a,b) => b[1]-a[1])[0];

  // Ativa as animações numéricas nos cards
  animateCount(document.getElementById('stat-pop'), totalPop, 2000, fmtNum);
  animateCount(document.getElementById('stat-mun'), totalMun, 1600, fmtNum);
  animateCount(document.getElementById('stat-media'), media, 1800, fmtNum);
  document.getElementById('stat-maior').textContent = `${maiorUF[0]} (${fmtNum(maiorUF[1])})`;

  // G1 - Tooltips customizados e traduzidos
  embed("#g1", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: dados }, 
    mark: { type: "bar", color: "steelblue" }, 
    encoding: { 
      x: { field: "UF", type: "nominal", title: "Estado" }, 
      y: { field: "Populacao", type: "quantitative", aggregate: "sum", title: "População" },
      tooltip: [
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", aggregate: "sum", title: "População Total", format: ",.0f" }
      ]
    } 
  });

  // G2 
  const top10 = dados.slice().sort((a,b) => b.Populacao - a.Populacao).slice(0, 10);
  embed("#g2", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: top10 }, 
    mark: { type: "bar", color: "darkred" }, 
    encoding: { 
      x: { field: "Populacao", type: "quantitative", title: "Habitantes" }, 
      y: { field: "Municipio", type: "nominal", sort: "-x", title: "Município" },
      tooltip: [
        { field: "Municipio", type: "nominal", title: "Município" },
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", title: "População", format: ",.0f" }
      ]
    } 
  });

  // G3 
  embed("#g3", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: dados }, 
    mark: { type: "area", line: true, color: "#2ecc71", opacity: 0.6 }, 
    encoding: { 
      x: { field: "Populacao", type: "quantitative", bin: { maxbins: 30 }, title: "Faixas Populacionais" }, 
      y: { aggregate: "count", title: "Qtd Municípios" },
      tooltip: [
        { field: "Populacao", type: "quantitative", bin: { maxbins: 30 }, title: "Faixa Populacional" },
        { aggregate: "count", type: "quantitative", title: "Quantidade de Cidades" }
      ]
    } 
  });

  // G4 
  embed("#g4", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: dados }, 
    mark: { type: "circle", color: "#3498db", size: 30, opacity: 0.5 }, 
    encoding: { 
      x: { field: "UF", type: "nominal", title: "Estado" }, 
      y: { field: "Populacao", type: "quantitative", title: "População" },
      tooltip: [
        { field: "Municipio", type: "nominal", title: "Município" },
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", title: "População", format: ",.0f" }
      ]
    } 
  });

  // G5 
  const spTop20 = dados.filter(d => d.UF === "SP").sort((a,b) => b.Populacao - a.Populacao).slice(0, 20);
  embed("#g5", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: spTop20 }, 
    mark: { type: "bar", color: "#e67e22" }, 
    encoding: { 
      x: { field: "Municipio", type: "nominal", sort: "-y", title: "Cidades de SP", axis: { labelAngle: -40 } }, 
      y: { field: "Populacao", type: "quantitative", title: "Habitantes" },
      tooltip: [
        { field: "Municipio", type: "nominal", title: "Cidade" },
        { field: "Populacao", type: "quantitative", title: "População", format: ",.0f" }
      ]
    } 
  });

  // G6 
  embed("#g6", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: dados }, 
    mark: { type: "line", point: { filled: true, fill: "white" }, color: "#9b59b6", strokeWidth: 2 }, 
    encoding: { 
      x: { field: "UF", type: "nominal", title: "Estado" }, 
      y: { field: "Populacao", type: "quantitative", aggregate: "mean", title: "Média" },
      tooltip: [
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", aggregate: "mean", title: "Média do Estado", format: ",.0f" }
      ]
    } 
  });

  // G7 
  const bottom20 = dados.slice().sort((a,b) => a.Populacao - b.Populacao).slice(0, 20);
  embed("#g7", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: bottom20 }, 
    mark: { type: "circle", color: "#f1c40f", size: 80, opacity: 0.8 }, 
    encoding: { 
      x: { field: "Populacao", type: "quantitative", title: "População" }, 
      y: { field: "Municipio", type: "nominal", sort: "x", title: "Município" },
      tooltip: [
        { field: "Municipio", type: "nominal", title: "Município" },
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", title: "Habitantes", format: ",.0f" }
      ]
    } 
  });

  // G8 - Legenda visível e Tooltips traduzidos
  embed("#g8", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, 
    height: H + 40, 
    data: { values: dados }, 
    mark: { type: "bar" }, 
    encoding: { 
      x: { field: "Populacao", type: "quantitative", aggregate: "sum", title: "População Total" }, 
      y: { field: "UF", type: "nominal", sort: "-x", title: "Estado" }, 
      color: { field: "Populacao", type: "quantitative", aggregate: "sum", scale: { scheme: "blues" }, title: "Volume" },
      tooltip: [
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", aggregate: "sum", title: "População Somada", format: ",.0f" }
      ]
    } 
  });

  // G9 
  embed("#g9", { 
    $schema: "https://vega.github.io/schema/vega-lite/v5.json", 
    config: CONFIG, height: H, data: { values: dados }, 
    mark: { type: "area", color: "#1abc9c", opacity: 0.8, line: true }, 
    encoding: { 
      x: { field: "UF", type: "nominal", title: "Estado" }, 
      y: { field: "Populacao", type: "quantitative", aggregate: "sum", title: "Soma População" },
      tooltip: [
        { field: "UF", type: "nominal", title: "Estado" },
        { field: "Populacao", type: "quantitative", aggregate: "sum", title: "Total Acumulado", format: ",.0f" }
      ]
    } 
  });

  buildTable(document.getElementById('table-top'), top10, 'Municipio');
  buildTable(document.getElementById('table-bot'), bottom20.slice(0,10), 'Municipio');

  const ufRank = Object.entries(byUF).sort((a,b) => b[1]-a[1]).slice(0,10).map(([UF, Populacao]) => ({ UF, Populacao }));
  buildTable(document.getElementById('table-uf'), ufRank, 'UF', true);

  const mediaUF = Object.entries(
    dados.reduce((acc, d) => { if (!acc[d.UF]) acc[d.UF] = []; acc[d.UF].push(d.Populacao); return acc; }, {})
  ).map(([UF, pops]) => ({ UF, Populacao: Math.round(pops.reduce((s,p)=>s+p,0)/pops.length) }))
   .sort((a,b) => b.Populacao - a.Populacao).slice(0,10);
  buildTable(document.getElementById('table-media'), mediaUF, 'UF', true);

  // Remove a tela de carregamento assim que tudo estiver renderizado
  document.getElementById("loading").classList.add("done");
}

init();