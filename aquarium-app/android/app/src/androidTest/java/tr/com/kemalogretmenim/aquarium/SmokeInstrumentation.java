package tr.com.kemalogretmenim.aquarium;

import android.app.*;
import android.content.*;
import android.content.pm.ActivityInfo;
import android.graphics.*;
import android.os.Bundle;
import android.view.*;
import android.webkit.WebView;
import java.io.*;
import java.lang.reflect.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Disposable emulator smoke test. Never signs in or changes a real class. */
@android.annotation.TargetApi(26)
public class SmokeInstrumentation extends Instrumentation {
    private MainActivity activity;
    private WebView web;
    private int checks;
    private boolean parentSharingOnly;
    @Override public void onCreate(Bundle arguments) {super.onCreate(arguments);parentSharingOnly=arguments!=null&&"true".equals(arguments.getString("parentSharing"));start();}
    private void check(boolean condition,String name) {if(!condition)throw new AssertionError(name+"; network error="+field("lastNetworkError"));checks++;android.util.Log.i("AquariumSmoke",name);}
    private Object field(String name) {
        try{Field field=MainActivity.class.getDeclaredField(name);field.setAccessible(true);return field.get(activity);}
        catch(Exception e){throw new RuntimeException(e);}
    }
    private String js(String source) throws Exception {
        AtomicReference<String> value=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
        runOnMainSync(()->web.evaluateJavascript(source,result->{value.set(result);done.countDown();}));
        if(!done.await(30,TimeUnit.SECONDS))throw new AssertionError("JavaScript timeout; network error="+field("lastNetworkError"));return value.get();
    }
    private boolean waitJS(String source,long timeout) throws Exception {
        long until=System.currentTimeMillis()+timeout;
        do {if("true".equals(js(source)))return true;Thread.sleep(200);}while(System.currentTimeMillis()<until);return false;
    }
    private View labeled(View view,String label){
        if(label.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){View found=labeled(group.getChildAt(i),label);if(found!=null)return found;}}
        return null;
    }
    private void tapWebButton(String id) throws Exception {
        js("document.getElementById('"+id+"').scrollIntoView({block:'center'});true");waitForIdleSync();
        String position=js("(function(){var r=document.getElementById('"+id+"').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()");
        org.json.JSONArray point=new org.json.JSONArray(position);
        float scale=web.getWidth()/Float.parseFloat(js("String(innerWidth)").replace("\"",""));
        float x=(float)point.getDouble(0)*scale,y=(float)point.getDouble(1)*scale;
        long time=android.os.SystemClock.uptimeMillis();
        runOnMainSync(()->{
            MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,x,y,0),up=MotionEvent.obtain(time,time+90,MotionEvent.ACTION_UP,x,y,0);
            web.dispatchTouchEvent(down);web.dispatchTouchEvent(up);down.recycle();up.recycle();
        });waitForIdleSync();
    }
    private void checkParentSharing() throws Exception {
        String code="11111111-1111-4111-8111-111111111111",url="https://kemalogretmenim.com.tr/ogretmen/akvaryum.html?cocuk="+code;
        String fixture="<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{background:#082f3d;color:white;font:18px system-ui;padding:12px}button,input{display:block;width:90%;margin:10px;padding:15px;box-sizing:border-box}button{background:#a0eac8;color:#082f3d;border:0;border-radius:14px}</style><h2>Veli erişimi · Yerel test</h2><input id='draft' value='Döndürme taslağı'><script>var access={studentName:'İpek',className:'Örnek sınıf',code:'"+code+"',url:'"+url+"'};window.pageMarker=Date.now();</script><button id='share' onclick=\"AquariumNativeShare.share(access,'system')\">Kod ve bağlantıyı paylaş</button><button id='whatsapp' onclick=\"AquariumNativeShare.share(access,'whatsapp')\">WhatsApp</button><button id='copy' onclick=\"AquariumNativeShare.copy(access,'message')\">Kod ve bağlantıyı kopyala</button>";
        runOnMainSync(()->{
            activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON|WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
            web.stopLoading();android.webkit.WebViewClient original=web.getWebViewClient();
            web.setWebViewClient(new android.webkit.WebViewClient(){
                @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){
                    if(request.isForMainFrame()&&request.getUrl().toString().endsWith("?native-parent-test=1"))return new android.webkit.WebResourceResponse("text/html","UTF-8",new ByteArrayInputStream(fixture.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                    return original.shouldInterceptRequest(view,request);
                }
                @Override public void onPageStarted(WebView view,String address,Bitmap icon){original.onPageStarted(view,address,icon);}
                @Override public void onPageFinished(WebView view,String address){original.onPageFinished(view,address);}
            });
            web.loadUrl("https://kemalogretmenim.com.tr/ogretmen/akvaryum.html?native-parent-test=1");
        });
        check(waitJS("!!window.AquariumNativeShare && !!document.getElementById('share')",10000),"Updated shell installed on the offline owned-origin fixture");
        check(field("exportPort")!=null,"Origin-bound native message channel installed");
        AtomicReference<Intent> intercepted=new AtomicReference<>();AtomicInteger launches=new AtomicInteger();
        ActivityMonitor monitor=new ActivityMonitor(){@Override public ActivityResult onStartActivity(Intent intent){
            if(Intent.ACTION_CHOOSER.equals(intent.getAction())||Intent.ACTION_SEND.equals(intent.getAction())){intercepted.set(intent);launches.incrementAndGet();return new ActivityResult(Activity.RESULT_CANCELED,null);}return null;
        }};addMonitor(monitor);
        try{
            tapWebButton("share");long deadline=System.currentTimeMillis()+5000;while(intercepted.get()==null&&System.currentTimeMillis()<deadline)Thread.sleep(100);
            Intent chooser=intercepted.get();check(chooser!=null&&Intent.ACTION_CHOOSER.equals(chooser.getAction()),"Trusted share tap opens the Android share sheet");
            Intent payload=chooser.getParcelableExtra(Intent.EXTRA_INTENT);check(payload!=null&&Intent.ACTION_SEND.equals(payload.getAction())&&"text/plain".equals(payload.getType()),"Share sheet receives a text-only SEND intent");
            String text=payload.getStringExtra(Intent.EXTRA_TEXT);check(text.contains("İpek için Örnek sınıf")&&text.contains("Veli kodu: "+code)&&text.contains("Bağlantı: "+url),"One private message includes the child, code and link");
            check(!text.contains("access_token")&&!text.contains("puan"),"Shared message contains no account session or pupil scores");
            intercepted.set(null);tapWebButton("whatsapp");deadline=System.currentTimeMillis()+5000;while(intercepted.get()==null&&System.currentTimeMillis()<deadline)Thread.sleep(100);
            Intent whatsapp=intercepted.get();check(whatsapp!=null&&Intent.ACTION_SEND.equals(whatsapp.getAction())&&"com.whatsapp".equals(whatsapp.getPackage()),"WhatsApp tap selects the installed-app send path; the monitor prevents delivery");
            runOnMainSync(()->((android.content.ClipboardManager)activity.getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("test","before-parent-copy")));
            tapWebButton("copy");
            AtomicReference<String> clipboardText=new AtomicReference<>();deadline=System.currentTimeMillis()+3000;
            // The headless runner may lose window focus to emulator SystemUI.
            // Grant only the test reader background-clipboard access; the app
            // keeps its sole INTERNET permission and uses the normal writer.
            if(android.os.Build.VERSION.SDK_INT>=29)getUiAutomation().adoptShellPermissionIdentity("android.permission.READ_CLIPBOARD_IN_BACKGROUND");
            try{do {runOnMainSync(()->{android.content.ClipboardManager clipboard=(android.content.ClipboardManager)activity.getSystemService(Context.CLIPBOARD_SERVICE);clipboardText.set(clipboard.hasPrimaryClip()?clipboard.getPrimaryClip().getItemAt(0).coerceToText(activity).toString():"");});if(text.equals(clipboardText.get()))break;Thread.sleep(100);}while(System.currentTimeMillis()<deadline);}
            finally{if(android.os.Build.VERSION.SDK_INT>=29)getUiAutomation().dropShellPermissionIdentity();}
            check(text.equals(clipboardText.get()),"Native clipboard receives both code and link, without WebView clipboard permission");
            String marker=js("String(window.pageMarker)");runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));Thread.sleep(800);waitForIdleSync();
            check(field("web")==web&&marker.equals(js("String(window.pageMarker)")),"Landscape transition retains the same sharing page and native bridge");
            check("\"Döndürme taslağı\"".equals(js("document.getElementById('draft').value")),"Sharing form survives screen rotation");
            runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));Thread.sleep(800);waitForIdleSync();
            check(marker.equals(js("String(window.pageMarker)")),"Portrait transition remains continuous");
            check(waitJS("!navigator.userActivation.isActive",6500),"Transient user activation expires before the background-script check");
            intercepted.set(null);int previous=launches.get();js("AquariumNativeShare.share(access,'system')");Thread.sleep(150);
            check(launches.get()==previous,"A script without a fresh user gesture cannot open a share sheet");
        }finally{removeMonitor(monitor);runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));}
    }
    private void capture(String name) throws Exception {
        AtomicReference<Bitmap> image=new AtomicReference<>();CountDownLatch painted=new CountDownLatch(1),copied=new CountDownLatch(1);AtomicInteger copiedResult=new AtomicInteger(-1);
        runOnMainSync(()->web.postVisualStateCallback(1,new WebView.VisualStateCallback(){@Override public void onComplete(long id){painted.countDown();}}));
        if(!painted.await(15,TimeUnit.SECONDS))throw new AssertionError("WebView visual state timeout");Thread.sleep(700);
        runOnMainSync(()->{
            View view=activity.getWindow().getDecorView();Bitmap bitmap=Bitmap.createBitmap(view.getWidth(),view.getHeight(),Bitmap.Config.ARGB_8888);image.set(bitmap);
            PixelCopy.request(activity.getWindow(),bitmap,result->{copiedResult.set(result);copied.countDown();},new android.os.Handler(android.os.Looper.getMainLooper()));
        });
        if(!copied.await(15,TimeUnit.SECONDS)||copiedResult.get()!=PixelCopy.SUCCESS)throw new AssertionError("App window copy failed");
        try(OutputStream stream=new FileOutputStream(new File(getTargetContext().getFilesDir(),name))){image.get().compress(Bitmap.CompressFormat.PNG,100,stream);}image.get().recycle();
    }
    @Override public void onStart() {
        Bundle result=new Bundle();
        try {
            Intent launch=getTargetContext().getPackageManager().getLaunchIntentForPackage(getTargetContext().getPackageName());
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);activity=(MainActivity)startActivitySync(launch);waitForIdleSync();web=(WebView)field("web");
            check(web!=null,"Native WebView exists");
            if(parentSharingOnly){checkParentSharing();result.putString("stream","PASS: "+checks+" offline Android parent-sharing checks; no real account or message sent.\n");finish(Activity.RESULT_OK,result);return;}
            check(waitJS("location.pathname.indexOf('akvaryum')>=0 && document.readyState==='complete'",60000),"Live aquarium opened");
            check(waitJS("document.documentElement.classList.contains('aquarium-native')",10000),"Native adaptation applied");
            check("true".equals(js("document.querySelector('.topbar .brand')===null || getComputedStyle(document.querySelector('.topbar .brand')).display==='none'")),"Duplicate website branding hidden");
            AtomicReference<Intent> external=new AtomicReference<>(),backup=new AtomicReference<>();
            ActivityMonitor monitor=new ActivityMonitor(){@Override public ActivityResult onStartActivity(Intent intent){
                if(Intent.ACTION_VIEW.equals(intent.getAction())){external.set(intent);return new ActivityResult(Activity.RESULT_CANCELED,null);}
                if(Intent.ACTION_CREATE_DOCUMENT.equals(intent.getAction())){backup.set(intent);return new ActivityResult(Activity.RESULT_CANCELED,null);}return null;
            }};addMonitor(monitor);
            runOnMainSync(()->{View home=labeled(activity.getWindow().getDecorView(),"Ana sayfa · Varsayılan tarayıcıda aç");if(home==null)throw new AssertionError("Home button missing");home.performClick();});
            check(external.get()!=null&&"https://kemalogretmenim.com.tr/".equals(external.get().getDataString()),"Home delegates to system browser");
            runOnMainSync(()->web.loadUrl("https://kemalogretmenim.com.tr/ogretmen/akvaryum.html?demo=1"));
            check(waitJS("location.search==='?demo=1' && document.querySelectorAll('.fish').length>=3 && document.documentElement.classList.contains('aquarium-native')",40000),"Example class rendered");
            check("true".equals(js("(function(){localStorage.setItem('aquarium_native_smoke','kept');return true;})()")),"Own test storage can be written");
            js("document.querySelector('.fish').click();true");check(waitJS("!!document.querySelector('dialog[open]')",3000),"Fish scoring dialog opened");
            runOnMainSync(()->activity.onBackPressed());check(waitJS("!document.querySelector('dialog[open]')",3000),"Android Back closes dialog before leaving");
            capture("aquarium-phone.png");
            String navigationStart=js("String(performance.timeOrigin)");
            js("document.querySelector('.header-actions [data-action=settings]').click();true");
            check(waitJS("!!document.querySelector('#renameClassForm input[name=name]')",5000),"Class settings opened");
            js("document.querySelector('#renameClassForm input[name=name]').value='Döndürme taslağı';true");
            runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));Thread.sleep(1200);waitForIdleSync();
            check(field("web")==web,"Orientation retains the existing WebView");
            check(navigationStart.equals(js("String(performance.timeOrigin)")),"Rotation never reloads the document");
            check("true".equals(js("document.querySelector('#modal').open && document.querySelector('#renameClassForm input[name=name]').value==='Döndürme taslağı'")),"Open dialog and unsaved form survive rotation");
            check("\"kept\"".equals(js("localStorage.getItem('aquarium_native_smoke')")),"Storage survives orientation");
            check(waitJS("innerWidth>innerHeight && document.documentElement.scrollWidth<=innerWidth+1",5000),"Landscape viewport fits without horizontal overflow");
            check("true".equals(js("(function(){var r=document.querySelector('#modal').getBoundingClientRect();return r.height<=innerHeight && r.width<=innerWidth;})()")),"Landscape dialog fits inside the viewport");
            runOnMainSync(()->activity.onBackPressed());check(waitJS("!document.querySelector('dialog[open]')",3000),"Rotated dialog stays usable with Android Back");
            check(waitJS("Array.from(document.querySelectorAll('.fish')).filter(function(f){var r=f.getBoundingClientRect();return r.top>=0 && r.top+r.height/2<innerHeight;}).length>=3",5000),"Landscape keeps fish inside the visible screen");
            capture("aquarium-landscape.png");
            check(field("exportPort")!=null,"Native export channel installed");
            js("(function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({classes:[]})],{type:'application/json'}));a.download='test-backup.json';document.body.append(a);a.click();a.remove();return true;})()");
            long until=System.currentTimeMillis()+20000;while(backup.get()==null&&System.currentTimeMillis()<until)Thread.sleep(100);
            check(backup.get()!=null&&"application/json".equals(backup.get().getType()),"Origin-bound backup reaches native document picker");
            removeMonitor(monitor);
            js("document.querySelector('[data-action=activities]').click();true");
            check(waitJS("!!document.querySelector('#modal [data-action=timer]')",3000),"Class activity timer is available");
            js("document.querySelector('#modal [data-action=timer]').click();true");
            check(waitJS("!!document.querySelector('#timerForm')",3000),"Timer form opened");
            js("(function(){var f=document.querySelector('#timerForm');f.querySelector('[name=mode]').value='stopwatch';f.querySelector('[name=mode]').dispatchEvent(new Event('change',{bubbles:true}));f.querySelector('[name=title]').value='Döndürme denemesi';f.requestSubmit();return true;})()");
            check(waitJS("!document.querySelector('#activityTimerBadge').hidden",3000),"Stopwatch started");
            // Starting the website timer intentionally closes its setup dialog.
            // Reopen the live timer controls before checking an open dialog.
            js("document.querySelector('[data-action=activities]').click();true");
            check(waitJS("!!document.querySelector('#modal [data-action=timer]')",3000),"Running timer controls can be reopened");
            js("document.querySelector('#modal [data-action=timer]').click();true");
            check(waitJS("document.querySelector('#modal').open && !document.querySelector('#timerActive').hidden",3000),"Running timer dialog opened");
            for(int orientation:new int[]{ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE,ActivityInfo.SCREEN_ORIENTATION_PORTRAIT}) {
                runOnMainSync(()->activity.setRequestedOrientation(orientation));Thread.sleep(800);waitForIdleSync();
                check(field("web")==web&&navigationStart.equals(js("String(performance.timeOrigin)")),"Repeated rotation keeps the same page");
                check("true".equals(js("document.querySelector('#modal').open && document.querySelector('#timerTitle').textContent==='Döndürme denemesi' && !document.querySelector('#timerActive').hidden")),"Running timer and dialog survive repeated rotation");
            }
            check(waitJS("document.querySelector('#timerClock').textContent.trim()!=='00:00'",6000),"Timer continues counting across rotation");
            runOnMainSync(()->activity.onBackPressed());check(waitJS("!document.querySelector('dialog[open]')",3000),"Portrait dialog remains usable");
            runOnMainSync(()->web.reload());
            check(waitJS("document.querySelectorAll('.fish').length>=3 && document.documentElement.classList.contains('aquarium-native')",30000),"Reload returns to aquarium");
            check("\"kept\"".equals(js("localStorage.getItem('aquarium_native_smoke')")),"Web storage survives refresh");
            js("localStorage.removeItem('aquarium_native_smoke');true");
            runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
            result.putString("stream","PASS: "+checks+" native Android checks. Demo only; no account login.\n");finish(Activity.RESULT_OK,result);
        } catch(Throwable error) {
            try {if(activity!=null)capture("aquarium-failure.png");}catch(Exception ignored){}
            StringWriter text=new StringWriter();error.printStackTrace(new PrintWriter(text));result.putString("stream","FAIL after "+checks+" checks: "+text);finish(Activity.RESULT_CANCELED,result);
        }
    }
}
