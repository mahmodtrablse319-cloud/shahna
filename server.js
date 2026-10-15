const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,ADMIN=process.env.ADMIN_PASSWORD;
if(!ADMIN||ADMIN.length<8){console.error('Set ADMIN_PASSWORD (8+ chars)');process.exit(1)}
const DBF=path.join(process.env.DATA_DIR||__dirname,'data','db.json');
fs.mkdirSync(path.dirname(DBF),{recursive:true});
let db={users:{},sessions:{},deps:[],ords:[]};
try{db=JSON.parse(fs.readFileSync(DBF))}catch{}
const save=()=>{fs.writeFileSync(DBF+'.tmp',JSON.stringify(db));fs.renameSync(DBF+'.tmp',DBF)};
const games=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'games.json'),'utf8'));
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const sha=x=>crypto.createHash('sha256').update(x).digest();
const same=(a,b)=>crypto.timingSafeEqual(sha(a),sha(b));
const tok=()=>crypto.randomBytes(24).toString('hex');
const r2=n=>Math.round(n*100)/100;
const MIME={'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const fails={};
const PUB=path.join(__dirname,'public');
http.createServer((q,r)=>{
 const send=(c,o)=>{r.writeHead(c,{'content-type':'application/json'});r.end(JSON.stringify(o))};
 if(!q.url.startsWith('/api/')){
  let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  const fp=path.join(PUB,path.normalize(f));
  if(!fp.startsWith(PUB)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);return r.end('404')}
  r.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream'});return fs.createReadStream(fp).pipe(r)}
 let b='';q.on('data',d=>{b+=d;if(b.length>1e5)q.destroy()});
 q.on('end',()=>{
  let j={};try{j=JSON.parse(b||'{}')}catch{}
  const ip=q.socket.remoteAddress,s=db.sessions[q.headers['x-token']];
  const me=s&&!s.admin?s.u:null,adm=!!(s&&s.admin),e=q.url.slice(5).split('?')[0];
  const bad=m=>send(400,{err:m}),need=()=>send(401,{err:'سجّل دخولك أولاً'});
  const login=u=>{const t=tok();db.sessions[t]={u};save();send(200,{t})};
  try{
  if((e==='login'||e==='admin/login')&&(fails[ip]||0)>=10)return send(429,{err:'محاولات كثيرة، جرّب لاحقاً'});
  if(e==='games')return send(200,games());
  if(e==='register'){const u=String(j.u||'').trim().toLowerCase(),p=String(j.p||'');
   if(u.length<3||u.length>40||p.length<6)return bad('اسم المستخدم 3 أحرف على الأقل وكلمة السر 6 على الأقل');
   if(db.users[u])return bad('اسم المستخدم مستخدم');
   const salt=tok();db.users[u]={salt,h:hash(p,salt),bal:0};return login(u)}
  if(e==='login'){const u=String(j.u||'').trim().toLowerCase(),x=db.users[u];
   if(!x||!same(x.h,hash(String(j.p||''),x.salt))){fails[ip]=(fails[ip]||0)+1;setTimeout(()=>delete fails[ip],6e5);return bad('بيانات الدخول غير صحيحة')}
   return login(u)}
  if(e==='admin/login'){if(!same(String(j.p||''),ADMIN)){fails[ip]=(fails[ip]||0)+1;setTimeout(()=>delete fails[ip],6e5);return bad('الرمز خطأ')}
   const t=tok();db.sessions[t]={admin:1};save();return send(200,{t})}
  if(e==='me'){if(!me)return need();return send(200,{u:me,bal:db.users[me].bal,deps:db.deps.filter(d=>d.u===me),ords:db.ords.filter(o=>o.u===me)})}
  if(e==='deposit'){if(!me)return need();const a=+j.a,tx=String(j.tx||'').trim();
   if(!(a>0&&a<=10000)||tx.length<4||tx.length>60)return bad('تأكد من المبلغ ورقم العملية');
   if(db.deps.some(d=>d.tx===tx))return bad('رقم العملية مستخدم سابقاً');
   db.deps.unshift({i:db.deps.length,u:me,a:r2(a),tx,s:'بانتظار التأكيد'});db.deps.sort((x,y)=>y.i-x.i);save();return send(200,{})}
  if(e==='buy'){if(!me)return need();const x=games()[j.g],p=x&&x.p[j.pk],id=String(j.id||'').trim();
   if(!p)return bad('اختر الباقة');if(!id||id.length>80)return bad('اكتب رقم اللاعب');
   const u=db.users[me];if(u.bal<p[1])return bad('رصيدك لا يكفي');
   u.bal=r2(u.bal-p[1]);db.ords.push({i:db.ords.length,u:me,g:x.n,p:p[0],c:p[1],id,s:'قيد التنفيذ',t:Date.now()});db.ords.sort((x,y)=>y.i-x.i);save();return send(200,{})}
  if(e.startsWith('admin/')){if(!adm)return need();
   if(e==='admin/list')return send(200,{deps:db.deps.filter(d=>d.s!=='مؤكدة'),ords:db.ords.filter(o=>o.s!=='تم الشحن')});
   if(e==='admin/confirm'){const d=db.deps.find(x=>x.i===j.i);if(!d||d.s==='مؤكدة')return bad('غير موجود');d.s='مؤكدة';const u=db.users[d.u];u.bal=r2(u.bal+d.a);save();return send(200,{})}
   if(e==='admin/done'){const o=db.ords.find(x=>x.i===j.i);if(!o)return bad('غير موجود');o.s='تم الشحن';save();return send(200,{})}}
  send(404,{err:'غير موجود'})
  }catch(x){console.error(x);send(500,{err:'خطأ في السيرفر'})}
 })}).listen(PORT,()=>console.log('Shahna on '+PORT));
