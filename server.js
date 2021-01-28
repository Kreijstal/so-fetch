const fs = require('fs');

const fetch = require('node-fetch');
const { send } = require('micro')
var uri = require('lil-uri')
const historyFilename = '.data/history.txt'
var ftp = require('@icetee/ftp');
const readHistory = function readHistoryFunc(res) {
  fs.readFile(historyFilename, 'utf8', (err, history) => {
    if (err) send(res, 500);
    res.setHeader('Content-type', 'text/plain; charset=utf-8');
    const lastFifty = history.split('\n').slice(-50).reverse().join('\n'); // TK make more efficient? (fs.stat, just read end of file)
    send(res, 200, lastFifty);
  });
}
/*var objectMap = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )*/
//returns a string, or a stream
async function execurl(url,req){
  
if(uri(url).protocol()=="ftp"){
  return new Promise((resolve,reject)=>{
      var c = new ftp();
    
  c.on('ready', function() {
    var p=decodeURI(uri(url).path());
    if(p[p.length-1]=="/"){                
    c.list(p,function(err, list) {
      if (err) throw err;
      //console.dir(list);
      function getlast(str){
        var parts=encodeURI(str).split("/")
        return parts.pop()||parts.pop()
      }
      c.end();
      resolve( `<!DOCTYPE html>
<html>
<head>
	<title>Index of ${p}</title>
	<meta content="text/html; charset=utf-8" http-equiv="Content-Type">
	<meta content="width=640, maximum-scale=4, initial-scale=1.0" name="viewport">
	<meta content="yes" name="apple-mobile-web-app-capable">
</head>
<body>
	<h1>Index of ${p}</h1>
	<table>
		<tr>
			<th valign="top"><img alt="[ICO]" src="https://sofetchpost.glitch.me/http://www.xray.mpe.mpg.de/icons/apache/blank.gif"></th>
			<th>Name</th>
			<th>Last modified</th>
			<th>Size</th>
			<th>Description</th>
		</tr>
		<tr>
			<th colspan="5">
				<hr>
			</th>
		</tr>
		<tr>
			<td valign="top"><img alt="[PARENTDIR]" src="https://sofetchpost.glitch.me/http://www.xray.mpe.mpg.de/icons/apache/back.gif"></td>
			<td><a href="..">Parent Directory</a></td>
			<td>&nbsp;</td>
			<td align="right">-</td>
			<td>&nbsp;</td>
		</tr>`+
      list.map(a=>`		<tr>
			<td valign="top"><img alt="${a.type=="d"?"[DIR]":"[TXT]"}" src="https://sofetchpost.glitch.me/http://www.xray.mpe.mpg.de/icons/apache/${a.type=="d"?"folder.gif":"text.gif"}"></td>
			<td>
				<a href="${getlast(a.name)+(a.type=="d"?"/":"")}">${a.name}</a>
			</td>
			<td align="right">${a.date.toDateString()}</td>
			<td align="right">${a.size}</td>
			<td>&nbsp;</td>
		</tr>`).join('\n')+`<tr>
			<th colspan="5">
				<hr>
			</th>
		</tr>
	</table>
	<address>
		Made with love thanks to glitch.com<!--yeah this was from apache, why do you ask?-->
	</address>
</body>
</html>`)
      //send(res,200)
      
    });
    }else{
     c.get(p, function(err, stream) {
      if (err){console.log(decodeURI(uri(url).path()),"did you really just error on me?"); throw err};
      stream.once('close', function() { c.end(); });
      resolve(stream);
    });
    }
  });
  
  c.connect(uri(url).parts);
      
    })
}
    else{
    const data = await fetch(url,{method:req.method,headers:filob(req.headers,["host","referer"]),redirect:"follow",body:req.body});
    
    return data.body;
    }

  
  
  
}
function filob(ob,f){ return Object.keys(ob).filter(a=>!f.includes(a)).reduce((obj, key) => { obj[key] = ob[key];    return obj;  }, {}) }
module.exports = async function soFetchProxy(req, res) {
  var url = req.url.slice(1);
  var decompress=false;
  if (url.length === 0) return readHistory(res);
  console.log(req.url)
  console.log(JSON.stringify(req.headers))
  //res.write(JSON.stringify(req.method))
  //res.write(JSON.stringify(Object.getOwnPropertyNames(req.headers)))
  if(url?.split('/')[0]=="decomp"){
    let a=url.split('/');
     a.shift();
    url=a;
    decompress=true;
  }
  try {
    res.setHeader("Content-Security-Policy",`default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval' 'unsafe-dynamic'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src * data: blob: ; style-src * data: blob: 'unsafe-inline';font-src * data: blob: 'unsafe-inline';`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.appendFile(historyFilename, `${new Date()} 🚋 ${url}\n`, () => {}); // empty callback 🤷‍♀️
    var r=await execurl(url,req);
    if(r.pipe){r.pipe(res)}else{
          res.write(r);
    send(res,200);
    }

    
  } catch (err) {
    console.log(err)
    send(res, 404); // e.g. https://sofetch.glitch.me/favicon.ico or https://sofetch.glitch.me/https://sdjflskdjfklsdjflk.com
  }
  //res.close()
};