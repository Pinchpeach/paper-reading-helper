import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const file = new URLSearchParams(location.search).get("file");
const pagesEl = document.querySelector("#pages");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");
const titleEl = document.querySelector("#panel-title");
const descEl = document.querySelector("#panel-desc");
const keywordEl = document.querySelector("#keyword-list");
const chapterEl = document.querySelector("#chapter-list");
let scale = 1.25, pdfDoc = null, spans = [], analysis = null;

async function boot() {
  if (!file) { statusEl.textContent = "No PDF URL"; return; }
  try {
    pdfDoc = await pdfjs.getDocument({ url: file }).promise;
    statusEl.textContent = pdfDoc.numPages + " pages";
    document.querySelector("#zoom").textContent = Math.round(scale * 100) + "%";
    await render();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not load PDF";
    resultsEl.innerHTML = "<p class='muted'>PDF loading failed. The publisher may block cross-origin PDF access.</p>";
  }
}

async function render() {
  pagesEl.innerHTML = ""; spans = [];
  for (let n = 1; n <= pdfDoc.numPages; n++) {
    const page = await pdfDoc.getPage(n), vp = page.getViewport({ scale });
    const wrap = document.createElement("div");
    wrap.className = "page"; wrap.style.width = vp.width + "px"; wrap.style.height = vp.height + "px"; wrap.dataset.page = n;
    const canvas = document.createElement("canvas"), ratio = devicePixelRatio || 1;
    canvas.width = Math.floor(vp.width * ratio); canvas.height = Math.floor(vp.height * ratio);
    canvas.style.width = vp.width + "px"; canvas.style.height = vp.height + "px"; wrap.append(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: ratio === 1 ? null : [ratio,0,0,ratio,0,0] }).promise;
    const layer = document.createElement("div"); layer.className = "textLayer"; wrap.append(layer);
    const text = await page.getTextContent();
    for (const item of text.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const tx = pdfjs.Util.transform(vp.transform, item.transform), el = document.createElement("span"), font = Math.hypot(tx[2], tx[3]);
      el.textContent = item.str; el.dataset.page = n; el.dataset.font = font;
      el.style.left = tx[4] + "px"; el.style.top = (tx[5] - font) + "px"; el.style.fontSize = font + "px"; el.style.fontFamily = "sans-serif";
      layer.append(el); spans.push(el);
    }
    pagesEl.append(wrap);
  }
  if (analysis) analyze();
}

function importance(t) {
  let s = Math.min(t.length / 180, .35);
  if (/we (propose|present|introduce|develop)|our (method|approach|model)|results? (show|demonstrate)|significant|outperform|contribution/i.test(t)) s += .55;
  if (/however|therefore|in conclusion|we find/i.test(t)) s += .2;
  return Math.min(s, 1);
}
const stop = new Set("the a an and or but if then this that these those is are was were be been being of in on at to for from by with as we our they their it its can may using use used paper method results model approach based show shows proposed propose present".split(" "));
const words = t => (t.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).filter(w => !stop.has(w));
function similarity(a,b){const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>B.has(x)&&n++);return n/Math.min(A.size,B.size)}
function sentences(){const ordered=[...spans].sort((a,b)=>+a.dataset.page-+b.dataset.page||(parseFloat(a.style.top)-parseFloat(b.style.top))||(parseFloat(a.style.left)-parseFloat(b.style.left)));const out=[];let cur=null;for(const el of ordered){const page=+el.dataset.page,text=el.textContent.trim();if(!text)continue;if(!cur||cur.page!==page){if(cur&&cur.text.length>20)out.push(cur);cur={page,text:"",els:[]}}cur.text+=(cur.text?" ":"")+text;cur.els.push(el);if(/[.!?]["')\]]?$/.test(text)&&cur.text.length>35){out.push(cur);cur={page,text:"",els:[]}}}if(cur&&cur.text.length>20)out.push(cur);return out.map((s,id)=>({...s,id,score:importance(s.text),el:s.els[0]}))}
function detectChapters(ss){const candidates=spans.filter(s=>{const t=s.textContent.trim(),f=+s.dataset.font;return f>=13&&t.length<90&&(/^(\d+(\.\d+)*)?\s*(abstract|introduction|background|related work|method|methods|methodology|approach|experiments?|results?|discussion|conclusion|limitations?|references)\b/i.test(t)||/^(\d+(\.\d+)*)\s+[A-Z]/.test(t))}).map(s=>({title:s.textContent.trim(),page:+s.dataset.page,el:s}));const uniq=candidates.filter((x,i,a)=>i===0||x.title!==a[i-1].title||x.page!==a[i-1].page);if(!uniq.length)uniq.push({title:"Paper",page:1,el:spans[0]});return uniq.map((c,i)=>{const next=uniq[i+1],members=ss.filter(s=>s.page>=c.page&&(!next||s.page<next.page)).slice(0,80),ranked=[...members].sort((a,b)=>b.score-a.score),top=ranked.slice(0,3);return{...c,id:i,members,essentials:{problem:top[0]?.text||"No strong problem statement detected.",approach:top[1]?.text||"No strong approach statement detected.",finding:top[2]?.text||"No strong finding detected."}}})}
function buildAnalysis(){const ss=sentences(),ranked=[...ss].filter(x=>x.text.length>35).sort((a,b)=>b.score-a.score).slice(0,24),groups=[];for(const x of ranked){const g=groups.find(g=>g.members.some(m=>similarity(m.text,x.text)>=.22));g?g.members.push(x):groups.push({id:groups.length,members:[x]})}const concepts=groups.filter(g=>g.members.length>1).slice(0,6).map(g=>{const freq={};g.members.flatMap(m=>words(m.text)).forEach(w=>freq[w]=(freq[w]||0)+1);const label=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||"related idea";return{...g,label,summary:"These passages repeatedly discuss "+label+" and appear to express a related argument or method."}}),freq={};ranked.flatMap(x=>words(x.text)).forEach(w=>freq[w]=(freq[w]||0)+1);const keywords=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([word,count])=>({word,count,members:ranked.filter(x=>words(x.text).includes(word))}));return{sentences:ss,ranked,concepts,keywords,chapters:detectChapters(ss)}}
function mark(m,cls){(m.els||[m.el]).forEach(e=>e&&e.classList.add(cls))}
function clearMarks(){spans.forEach(s=>s.classList.remove("prh-important","prh-related"));document.querySelectorAll(".concept-bracket").forEach(x=>x.remove())}
function drawConcepts(){analysis.concepts.forEach(c=>{const pages=new Map;for(const m of c.members){if(!pages.has(m.page))pages.set(m.page,[]);pages.get(m.page).push(m)}for(const [page,ms] of pages){if(ms.length<2)continue;const wrap=document.querySelector('.page[data-page="'+page+'"]'),all=ms.flatMap(m=>m.els).map(e=>e.getBoundingClientRect()),wr=wrap.getBoundingClientRect(),top=Math.min(...all.map(r=>r.top))-wr.top,bottom=Math.max(...all.map(r=>r.bottom))-wr.top,b=document.createElement("div");b.className="concept-bracket";b.style.top=top+"px";b.style.height=Math.max(28,bottom-top)+"px";b.innerHTML="<button>●</button>";b.onclick=()=>showConcept(c);wrap.append(b)}})}
function clearRelated(){spans.forEach(s=>s.classList.remove("prh-related"))}
function member(box,m){const d=document.createElement("div");d.className="concept-member";d.textContent="p."+m.page+" · "+m.text;d.onclick=()=>m.el.scrollIntoView({behavior:"smooth",block:"center"});box.append(d)}
function showConcept(c){clearRelated();c.members.forEach(m=>mark(m,"prh-related"));titleEl.textContent=c.label;descEl.textContent=c.summary;resultsEl.innerHTML="";const card=document.createElement("div");card.className="concept-card";const h=document.createElement("h3");h.textContent=c.label;const p=document.createElement("p");p.textContent=c.summary;const box=document.createElement("div");card.append(h,p,box);resultsEl.append(card);c.members.forEach(m=>member(box,m))}
function showKeyword(k){clearRelated();k.members.forEach(m=>mark(m,"prh-related"));titleEl.textContent="# "+k.word;descEl.textContent=k.members.length+" important passages relate to this keyword.";resultsEl.innerHTML="";k.members.forEach(m=>member(resultsEl,m))}
function showChapter(c){clearRelated();c.members.forEach(m=>mark(m,"prh-related"));titleEl.textContent=c.title;descEl.textContent="Chapter essentials · starts around page "+c.page;resultsEl.innerHTML="";const card=document.createElement("div");card.className="concept-card";for(const [label,value] of [["Problem / context",c.essentials.problem],["Approach",c.essentials.approach],["Key finding",c.essentials.finding]]){const row=document.createElement("div");row.className="essential-row";const b=document.createElement("b");b.textContent=label;row.append(b,document.createTextNode(value));card.append(row)}resultsEl.append(card);c.el?.scrollIntoView({behavior:"smooth",block:"center"})}
function analyze(){clearMarks();analysis=buildAnalysis();analysis.ranked.slice(0,12).forEach(x=>mark(x,"prh-important"));titleEl.textContent="Important passages";descEl.textContent=analysis.sentences.length+" sentences · "+analysis.chapters.length+" chapters detected.";resultsEl.innerHTML="";analysis.ranked.slice(0,12).forEach(x=>{const d=document.createElement("div");d.className="result";const score=document.createElement("span");score.className="score";score.textContent="IMPORTANCE "+Math.round(x.score*100)+"%";const body=document.createElement("div");body.textContent=x.text;d.append(score,body);d.onclick=()=>x.el.scrollIntoView({behavior:"smooth",block:"center"});resultsEl.append(d)});chapterEl.innerHTML="";analysis.chapters.forEach(c=>{const d=document.createElement("div");d.className="chapter-card";const ref=document.createElement("span");ref.className="page-ref";ref.textContent="PAGE "+c.page;const h=document.createElement("h3");h.textContent=c.title;const p=document.createElement("p");p.textContent=c.essentials.finding.slice(0,130);d.append(ref,h,p);d.onclick=()=>showChapter(c);chapterEl.append(d)});keywordEl.innerHTML="";analysis.keywords.forEach(k=>{const b=document.createElement("button");b.className="keyword";b.textContent=k.word;b.onclick=()=>showKeyword(k);keywordEl.append(b)});drawConcepts()}
document.querySelector("#analyze").onclick=analyze;
document.querySelector("#plus").onclick=()=>{scale=Math.min(2,scale+.15);boot()};
document.querySelector("#minus").onclick=()=>{scale=Math.max(.7,scale-.15);boot()};
boot();
