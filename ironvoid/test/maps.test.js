const fs=require('fs');
global.window={IV:{}};
eval(fs.readFileSync('/home/user/crpgg/ironvoid/src/02_maps.js','utf8'));
const SOLID=new Set(['#','%','|',' ']);
let fail=0;
for(const m of window.IV.MAPS){
  const rows=m.rows, H=rows.length, W=rows[0].length;
  const bad=rows.map((r,i)=>r.length!==W?i:-1).filter(i=>i>=0);
  if(bad.length){console.log(m.id,'BAD WIDTHS',bad);fail++;continue;}
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?'#':rows[y][x];
  const starts=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(at(x,y)==='S')starts.push([x,y]);
  const seen=new Set(), q=[...starts];
  starts.forEach(([x,y])=>seen.add(x+','+y));
  while(q.length){const [x,y]=q.pop();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=nx+','+ny;
      if(seen.has(k))continue; if(SOLID.has(at(nx,ny)))continue;
      seen.add(k);q.push([nx,ny]);}}
  const unreachable=[];
  const counts={};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=at(x,y);
    if('cCeEXZVBM+S'.includes(c)){counts[c]=(counts[c]||0)+1;
      if(!seen.has(x+','+y))unreachable.push(c+'@'+x+','+y);}}
  const ok = unreachable.length===0 && starts.length>0 && counts.X>0 && counts.Z>0;
  if(!ok)fail++;
  console.log(m.id.padEnd(10), W+'x'+H, ok?'CONNECTED':'UNREACHABLE: '+unreachable.join(' '), JSON.stringify(counts));
}
process.exit(fail?1:0);
