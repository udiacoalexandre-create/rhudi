// Grava nave='N/A' em quem ainda nao tem o campo. Sem --aplicar, so mostra.
const fs=require('fs'),https=require('https'),crypto=require('crypto'),path=require('path');
const APLICAR=process.argv.includes('--aplicar');
const R=path.join(process.env.HOME,'udiaco-dados-privados');
const cabe=f=>/firebase-adminsdk.*\.json$/i.test(f);
let K=null;
for(const i of fs.readdirSync(R,{withFileTypes:true})){
  if(i.isFile()&&cabe(i.name)){K=path.join(R,i.name);break;}
  if(i.isDirectory()&&i.name!=='node_modules'){
    try{ const f=fs.readdirSync(path.join(R,i.name)).find(cabe); if(f){K=path.join(R,i.name,f);break;} }catch(e){}
  }
}
const sa=JSON.parse(fs.readFileSync(K,'utf8'));
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
const req=(m,u,c,t)=>new Promise((res,rej)=>{const U=new URL(u);
  const d=c?Buffer.from(typeof c==='string'?c:JSON.stringify(c)):null;
  const r=https.request({hostname:U.hostname,path:U.pathname+U.search,method:m,
    headers:Object.assign({},t?{Authorization:'Bearer '+t}:{},
      d?{'Content-Type':typeof c==='string'?'application/x-www-form-urlencoded':'application/json','Content-Length':d.length}:{})},
    x=>{let b='';x.on('data',q=>b+=q);x.on('end',()=>{let j=null;try{j=JSON.parse(b)}catch(e){};
      x.statusCode>=300?rej(new Error(x.statusCode+' '+String(b).slice(0,300))):res(j)})});
  r.on('error',rej); if(d)r.write(d); r.end();});
function leV(v){ if(!v) return null;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return v.doubleValue;
  if('booleanValue' in v) return v.booleanValue;
  if('nullValue' in v) return null;
  if('arrayValue' in v) return (v.arrayValue.values||[]).map(leV);
  if('mapValue' in v) return leC(v.mapValue); return null; }
const leC=d=>{const o={};Object.entries((d&&d.fields)||{}).forEach(([k,v])=>o[k]=leV(v));return o;};
const NAVES=['N/A','Nave 01','Nave 02','Nave 03','Circulando'];

(async()=>{
  const ag=Math.floor(Date.now()/1000);
  const c=b64({alg:'RS256',typ:'JWT'});
  const p=b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:ag,exp:ag+3600});
  const a=crypto.createSign('RSA-SHA256').update(c+'.'+p).sign(sa.private_key,'base64url');
  const tk=(await req('POST','https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+c+'.'+p+'.'+a)).access_token;
  const B='https://firestore.googleapis.com/v1/projects/'+sa.project_id
    +'/databases/(default)/documents/';
  let tok=null, cs=[];
  do{ const r=await req('GET',B+'colaboradores?pageSize=300'+(tok?'&pageToken='+tok:''),null,tk);
    (r.documents||[]).forEach(d=>cs.push(Object.assign({_id:d.name.split('/').pop()},leC(d))));
    tok=r.nextPageToken; }while(tok);

  const semNave=cs.filter(x=>!NAVES.includes(x.nave));
  console.log((APLICAR?'== GRAVANDO ==':'== PREVIA (rode com --aplicar) ==')
    +'\n  '+cs.length+' colaboradores'
    +'\n  '+semNave.length+' sem nave -> N/A'
    +'\n  '+(cs.length-semNave.length)+' ja tem nave valida');
  if(!APLICAR) return console.log('\nnada foi gravado.');

  let n=0;
  for(const x of semNave){
    await req('PATCH', B+'colaboradores/'+x._id+'?updateMask.fieldPaths=nave',
      {fields:{nave:{stringValue:'N/A'}}}, tk);
    if(++n%100===0) console.log('    '+n+'...');
  }
  let t2=null, dep=[];
  do{ const r=await req('GET',B+'colaboradores?pageSize=300'+(t2?'&pageToken='+t2:''),null,tk);
    (r.documents||[]).forEach(d=>dep.push(leC(d))); t2=r.nextPageToken; }while(t2);
  const falta=dep.filter(x=>!NAVES.includes(x.nave)).length;
  console.log('  '+n+' atualizados · sem nave agora: '+falta+(falta?'  ATENCAO':'  (ok)'));
})().catch(e=>{ console.error('erro:', e.message); process.exit(1); });
