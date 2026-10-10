import { mkdir, copyFile, cp, access } from 'node:fs/promises';
const out='public';
await mkdir(out,{recursive:true});
for(const file of ['index.html','styles.css','app.js','operations.html','operations.js','driver-rides.html','driver-rides.js','restaurants.html','restaurants.js']) {await access(file);await copyFile(file,`${out}/${file}`)}
try {await access('data');await cp('data',`${out}/data`,{recursive:true})}catch(e){if(e.code!=='ENOENT')throw e}
console.log('GoGo static build generated in public/');
