#!/bin/bash
docker exec invoicepilot-app node -e '
const fs=require("fs");
const s=fs.readFileSync("/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs","utf8");
let idx=0, n=0;
while((idx=s.indexOf("devCode: null", idx))!==-1){
  n++;
  console.log("--- occ", n, "at", idx, "---");
  console.log(s.slice(idx-250, idx+80));
  idx+=1;
}
'
