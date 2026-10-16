const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'aquarium-navigation-'));
const cases=JSON.parse(fs.readFileSync(path.join(root,'tests/navigation-cases.json')));
const javaDir=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin'):process.platform==='darwin'?'/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin':'';
const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
try {
 const javaCases=cases.map(([url,expected])=>`check(policy,${JSON.stringify(url)},${JSON.stringify(expected)});`).join('\n');
 fs.writeFileSync(path.join(temp,'NavigationCheck.java'),`import tr.com.kemalogretmenim.aquarium.NavigationPolicy;public class NavigationCheck{static void check(NavigationPolicy p,String u,String expected){if(!p.destination(u).name().equals(expected))throw new AssertionError(u+" => "+p.destination(u)+" != "+expected);}public static void main(String[] args){NavigationPolicy policy=new NavigationPolicy("https://kemalogretmenim.com.tr");${javaCases}System.out.println("Android: ${cases.length} URL kuralı geçti.");}}`);
 run(path.join(javaDir,'javac'),['-d',temp,path.join(root,'android/app/src/main/java/tr/com/kemalogretmenim/aquarium/NavigationPolicy.java'),path.join(temp,'NavigationCheck.java')]);
 process.stdout.write(run(path.join(javaDir,'java'),['-cp',temp,'NavigationCheck']));
 if(process.platform==='darwin'){
  const map={INTERNAL:'internalPage',EXTERNAL:'externalPage',BLOCK:'blocked'};
  const swiftCases=cases.map(([url,expected])=>`precondition(policy.destination(URL(string:${JSON.stringify(url)})!) == .${map[expected]}, ${JSON.stringify(url)});`).join('\n');
  fs.writeFileSync(path.join(temp,'main.swift'),`import Foundation\nlet policy=NavigationPolicy(origin:"https://kemalogretmenim.com.tr")\n${swiftCases}\nprint("iOS: ${cases.length} URL kuralı geçti.")\n`);
  run('/usr/bin/swiftc',['-module-cache-path',path.join(temp,'cache'),path.join(root,'ios/SinifAkvaryumu/NavigationPolicy.swift'),path.join(temp,'main.swift'),'-o',path.join(temp,'ios-navigation-check')]);
  process.stdout.write(run(path.join(temp,'ios-navigation-check'),[]));
 }
} finally {fs.rmSync(temp,{recursive:true,force:true});}
