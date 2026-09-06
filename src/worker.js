import {compare,optimize} from './optimizer.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/health')return json({status:'ok'});if(url.pathname==='/api/optimize'&&request.method==='POST'){try{const body=await request.json();return json(body.scenario==='compare'?compare(body):optimize(body,body.scenario));}catch(e){return json({error:e.message},422)}}return env.ASSETS.fetch(request)}};
