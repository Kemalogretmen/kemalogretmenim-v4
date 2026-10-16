package tr.com.kemalogretmenim.aquarium;

import android.annotation.SuppressLint;
import android.app.*;
import android.content.*;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.*;
import android.net.Uri;
import android.net.http.SslError;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** An aquarium-only native shell: the system browser owns all other pages. */
public class MainActivity extends Activity {
    private static final int BACKGROUND = Color.rgb(8,47,61), ACCENT = Color.rgb(160,234,200), INK = Color.rgb(227,247,246);
    private static final int PICK_FILE = 41, SAVE_FILE = 42;
    private FrameLayout root, stage;
    private LinearLayout column, toolbar, placeholder;
    private ProgressBar progress;
    private TextView statusTitle, statusText;
    private Button retry;
    private WebView web;
    private String site, aquarium, shellScript;
    private NavigationPolicy policy;
    private boolean mainFailed, rendererGone;
    private int lastNetworkError;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;
    private WebMessagePort exportPort;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;
    private ImageButton fullExit;
    private TextView brandLabel;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        WindowManager.LayoutParams windowParams=getWindow().getAttributes();
        windowParams.rotationAnimation=WindowManager.LayoutParams.ROTATION_ANIMATION_ROTATE;
        getWindow().setAttributes(windowParams);
        try {
            JSONObject config = new JSONObject(readAsset("app-config.json"));
            site = config.getString("siteOrigin"); aquarium = site + config.getString("aquariumPath");
            shellScript = readAsset("mobile-shell.js"); policy = new NavigationPolicy(site);
        } catch (Exception e) { throw new IllegalStateException("Uygulama yapılandırması okunamadı", e); }
        buildChrome();createWebView();
        updateCompactChrome();
        if (saved == null || web.restoreState(saved) == null || policy.destination(web.getUrl()) != NavigationPolicy.Destination.INTERNAL) web.loadUrl(aquarium);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::navigateBack);
    }
    private String readAsset(String name) throws IOException {
        try (InputStream stream = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int n;while ((n = stream.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int sp, int color) {
        TextView view = new TextView(this);view.setText(value);view.setTextSize(sp);view.setTextColor(color);return view;
    }
    private ImageButton icon(int resource, String label) {
        ImageButton button = new ImageButton(this);button.setImageResource(resource);button.setContentDescription(label);
        button.setBackgroundColor(Color.TRANSPARENT);button.setPadding(dp(12),dp(12),dp(12),dp(12));return button;
    }
    private void buildChrome() {
        getWindow().setStatusBarColor(BACKGROUND);getWindow().setNavigationBarColor(BACKGROUND);
        root = new FrameLayout(this);root.setBackgroundColor(BACKGROUND);
        column = new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);root.addView(column,new FrameLayout.LayoutParams(-1,-1));
        column.setOnApplyWindowInsetsListener((v,insets)-> {
            column.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;
        });
        toolbar = new LinearLayout(this);toolbar.setGravity(Gravity.CENTER_VERTICAL);toolbar.setPadding(dp(12),dp(4),dp(4),dp(4));toolbar.setBackgroundColor(BACKGROUND);
        ImageView fish = new ImageView(this);fish.setImageResource(R.drawable.ic_fish);fish.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        toolbar.addView(fish,new LinearLayout.LayoutParams(dp(34),dp(34)));
        LinearLayout titles = new LinearLayout(this);titles.setOrientation(LinearLayout.VERTICAL);titles.setPadding(dp(10),0,0,0);
        TextView title = text("Sınıf Akvaryumu",17,INK);title.setTypeface(null,Typeface.BOLD);title.setSingleLine(true);titles.addView(title);
        brandLabel = text("KEMAL ÖĞRETMENİM",9,ACCENT);brandLabel.setLetterSpacing(.13f);titles.addView(brandLabel);
        toolbar.addView(titles,new LinearLayout.LayoutParams(0,-2,1));
        ImageButton home = icon(R.drawable.ic_home,"Ana sayfa · Varsayılan tarayıcıda aç");home.setOnClickListener(v->openExternal(site + "/"));toolbar.addView(home,new LinearLayout.LayoutParams(dp(48),dp(48)));
        ImageButton menu = icon(R.drawable.ic_more,"Diğer seçenekler");menu.setOnClickListener(this::showMenu);toolbar.addView(menu,new LinearLayout.LayoutParams(dp(48),dp(48)));
        column.addView(toolbar,new LinearLayout.LayoutParams(-1,-2));
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setProgressTintList(ColorStateList.valueOf(ACCENT));progress.setMax(100);column.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        stage = new FrameLayout(this);column.addView(stage,new LinearLayout.LayoutParams(-1,0,1));
        placeholder = new LinearLayout(this);placeholder.setOrientation(LinearLayout.VERTICAL);placeholder.setGravity(Gravity.CENTER);placeholder.setPadding(dp(28),dp(24),dp(28),dp(24));placeholder.setBackgroundColor(BACKGROUND);
        ImageView logo = new ImageView(this);logo.setImageResource(R.mipmap.ic_launcher);placeholder.addView(logo,new LinearLayout.LayoutParams(dp(104),dp(104)));
        statusTitle = text("Deniz dostlarınız hazırlanıyor",22,INK);statusTitle.setTypeface(null,Typeface.BOLD);statusTitle.setGravity(Gravity.CENTER);statusTitle.setPadding(0,dp(20),0,dp(12));placeholder.addView(statusTitle);
        statusText = text("Sınıfınızın güzel adımları aynı akvaryumda.",14,Color.rgb(177,205,209));statusText.setGravity(Gravity.CENTER);placeholder.addView(statusText);
        retry = new Button(this);retry.setText(R.string.retry);retry.setTextColor(BACKGROUND);retry.setBackgroundTintList(ColorStateList.valueOf(ACCENT));LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-2,dp(52));rp.topMargin=dp(24);placeholder.addView(retry,rp);retry.setVisibility(View.GONE);retry.setOnClickListener(v->reloadAquarium());
        stage.addView(placeholder,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
    }
    @SuppressLint("SetJavaScriptEnabled") private void createWebView() {
        rendererGone=false;web = new WebView(this);web.setBackgroundColor(BACKGROUND);
        WebSettings settings = web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);settings.setSupportMultipleWindows(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString()+" SinifAkvaryumu/1.0 Android");
        settings.setBuiltInZoomControls(false);settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return route(request.getUrl().toString(),request.hasGesture());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return route(url,true); }
            @Override public void onPageStarted(WebView view,String url,Bitmap icon) { mainFailed=false;closeExportPort();progress.setVisibility(View.VISIBLE); }
            @Override public void onPageFinished(WebView view,String url) {
                CookieManager.getInstance().flush();
                if (!url.equals(view.getUrl()) || mainFailed || policy.destination(url) != NavigationPolicy.Destination.INTERNAL) return;
                view.evaluateJavascript(shellScript, ignored -> installExportPort(url));
                placeholder.setVisibility(View.GONE);progress.setVisibility(View.INVISIBLE);
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error) {
                if(request.isForMainFrame()) {lastNetworkError=error.getErrorCode();showError("Akvaryuma bağlanılamadı","İnternet bağlantınızı kontrol edip yeniden deneyin. Hesabınız ve cihazdaki kayıtlarınız silinmedi.");}
            }
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest request,WebResourceResponse response) {
                if(request.isForMainFrame() && response.getStatusCode()>=400) showError("Akvaryum şu an açılamıyor","Biraz sonra yeniden deneyin. Kayıtlarınız korunuyor.");
            }
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error) { handler.cancel();if(error.getUrl().equals(v.getUrl()))showError("Güvenli bağlantı kurulamadı","Cihazın tarihini ve internet bağlantısını kontrol edin."); }
            @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail) {
                if (Build.VERSION.SDK_INT>=26) {closeExportPort();stage.removeView(v);v.destroy();rendererGone=true;showError("Akvaryumu yeniden açalım","Cihaz görüntüyü yenilemek istiyor. Kayıtlarınız korunuyor.");return true;}return false;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v,int value) {progress.setProgress(value);}
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(fileCallback!=null) fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                try {startActivityForResult(picker,PICK_FILE);}catch(ActivityNotFoundException e){fileCallback.onReceiveValue(null);fileCallback=null;toast("Dosya seçici bulunamadı.");}return true;
            }
            @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean userGesture,Message result) {
                if(!userGesture) return false;
                WebView temporary = new WebView(MainActivity.this);
                temporary.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){openExternal(r.getUrl().toString());v.destroy();return true;}});
                ((WebView.WebViewTransport) result.obj).setWebView(temporary);result.sendToTarget();return true;
            }
            @Override public void onShowCustomView(View view,CustomViewCallback callback) {showFullscreen(view,callback);}
            @Override public void onHideCustomView() {hideFullscreen();}
        });
        web.setDownloadListener((url,ua,disposition,type,length)->{
            if(url.startsWith("https://"))openExternal(url);
            else toast("Yedeği Ayarlar → Yedek indir üzerinden kaydedin.");
        });
        stage.addView(web,0,new FrameLayout.LayoutParams(-1,-1));
    }
    private boolean route(String url,boolean gesture) {
        NavigationPolicy.Destination result = policy.destination(url);
        if(result==NavigationPolicy.Destination.INTERNAL)return false;
        if(result==NavigationPolicy.Destination.EXTERNAL && gesture)openExternal(url);
        return true;
    }
    private void openExternal(String value) {
        if(policy.destination(value)==NavigationPolicy.Destination.BLOCK)return;
        try {startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE));}
        catch(ActivityNotFoundException e){toast("Bu cihazda bir tarayıcı bulunamadı.");}
    }
    private void showMenu(View anchor) {
        PopupMenu menu = new PopupMenu(this,anchor);
        menu.getMenu().add(0,1,0,"Akvaryumu yenile");menu.getMenu().add(0,2,1,"Akvaryumu tarayıcıda aç");menu.getMenu().add(0,3,2,"Örnek sınıfı keşfet");menu.getMenu().add(0,4,3,"Uygulama hakkında");
        menu.setOnMenuItemClickListener(item->{switch(item.getItemId()){
            case 1: reloadAquarium();break;
            case 2:openExternal(aquarium);break;
            case 3:if(rendererGone)createWebView();web.loadUrl(aquarium+"?demo=1");break;
            case 4:new AlertDialog.Builder(this).setTitle("Sınıf Akvaryumu").setMessage("Kemal Öğretmenim · "+BuildConfig.VERSION_NAME+"\n\nTelefon ve tablet için sınıfınızın su altı dünyası.\n\nAkvaryumun canlı sürümü kullanılır. İlk açılış ve hesap eşitlemesi internet gerektirir. Tarayıcıdaki hesabınız uygulamaya otomatik aktarılmaz; bir kez e-posta ve şifrenizle giriş yapın.\n\nAna sayfa, cihazın varsayılan tarayıcısında açılır.").setPositiveButton("Tamam",null).show();break;
        }return true;});menu.show();
    }
    private void showError(String title,String message) {mainFailed=true;progress.setVisibility(View.INVISIBLE);statusTitle.setText(title);statusText.setText(message);retry.setVisibility(View.VISIBLE);placeholder.setVisibility(View.VISIBLE);placeholder.bringToFront();}
    private void reloadAquarium() {hideFullscreen();if(rendererGone)createWebView();retry.setVisibility(View.GONE);statusTitle.setText(R.string.loading_title);statusText.setText(R.string.loading_description);placeholder.setVisibility(View.VISIBLE);placeholder.bringToFront();String url=web.getUrl();web.loadUrl(policy.destination(url)==NavigationPolicy.Destination.INTERNAL?url:aquarium);}
    private void toast(String value){Toast.makeText(this,value,Toast.LENGTH_LONG).show();}
    private void installExportPort(String url) {
        if(mainFailed||!url.equals(web.getUrl())||policy.destination(url)!=NavigationPolicy.Destination.INTERNAL)return;
        closeExportPort();WebMessagePort[] ports=web.createWebMessageChannel();exportPort=ports[0];
        exportPort.setWebMessageCallback(new WebMessagePort.WebMessageCallback(){@Override public void onMessage(WebMessagePort port,WebMessage message){
            if(policy.destination(web.getUrl())!=NavigationPolicy.Destination.INTERNAL)return;
            try {
                if(pendingExport!=null)return;
                JSONObject payload=new JSONObject(message.getData());if(!"exportBackup".equals(payload.optString("type")))return;
                String contents=payload.getString("contents");if(contents.length()>5*1024*1024)throw new Exception();
                JSONObject document=new JSONObject(contents);if(!document.has("classes"))throw new Exception();
                String name=payload.optString("name","sinif-akvaryumu-yedek.json").replaceAll("[^a-zA-Z0-9._-]","_");
                if(!name.endsWith(".json"))name+=".json";
                pendingExport=contents.getBytes(StandardCharsets.UTF_8);
                startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,name),SAVE_FILE);
            }catch(Exception e){pendingExport=null;toast("Yedek kaydedilemedi. Tarayıcıda açarak tekrar deneyebilirsiniz.");}
        }});
        Uri page=Uri.parse(url);web.postWebMessage(new WebMessage("aquarium-shell-port",new WebMessagePort[]{ports[1]}),new Uri.Builder().scheme(page.getScheme()).authority(page.getAuthority()).build());
    }
    private void closeExportPort(){if(exportPort!=null){exportPort.close();exportPort=null;}}
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==PICK_FILE && fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(request==SAVE_FILE){byte[] contents=pendingExport;pendingExport=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&contents!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException();out.write(contents);toast("Akvaryum yedeği kaydedildi.");}catch(IOException e){toast("Dosya kaydedilemedi.");}}}
    }
    private void showFullscreen(View view,WebChromeClient.CustomViewCallback callback){
        if(fullView!=null){callback.onCustomViewHidden();return;}
        fullView=view;fullCallback=callback;root.addView(view,new FrameLayout.LayoutParams(-1,-1));column.setVisibility(View.GONE);
        root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        fullExit=icon(R.drawable.ic_close,"Tam ekrandan çık");fullExit.setBackgroundTintList(ColorStateList.valueOf(BACKGROUND));FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(dp(48),dp(48),Gravity.TOP|Gravity.END);p.setMargins(dp(16),dp(16),dp(16),0);root.addView(fullExit,p);fullExit.setOnClickListener(v->hideFullscreen());
    }
    private void hideFullscreen(){if(fullView==null)return;root.removeView(fullView);root.removeView(fullExit);fullView=null;column.setVisibility(View.VISIBLE);root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);if(fullCallback!=null){fullCallback.onCustomViewHidden();fullCallback=null;}}
    private void navigateBack(){
        if(fullView!=null){hideFullscreen();return;}
        if(rendererGone){moveTaskToBack(true);return;}
        web.evaluateJavascript("(function(){if(document.fullscreenElement){document.exitFullscreen();return true;}var d=document.querySelector('dialog[open]');if(d){var b=d.querySelector('[data-action=close]');if(b)b.click();else d.close();return true;}return false;})()", handled->{if(!"true".equals(handled)){if(web.canGoBack())web.goBack();else moveTaskToBack(true);}});
    }
    @Override public void onBackPressed(){navigateBack();}
    private void updateCompactChrome(){
        Configuration config=getResources().getConfiguration();
        boolean compact=config.orientation==Configuration.ORIENTATION_LANDSCAPE&&config.screenHeightDp<500;
        brandLabel.setVisibility(compact?View.GONE:View.VISIBLE);
        toolbar.setPadding(dp(12),compact?0:dp(4),dp(4),compact?0:dp(4));
    }
    @Override public void onConfigurationChanged(Configuration config){
        super.onConfigurationChanged(config);
        // Keep this exact WebView and DOM alive: dialog drafts, timers, audio,
        // the account and swimmers must survive phone/tablet rotation.
        updateCompactChrome();
    }
    @Override protected void onSaveInstanceState(Bundle out){if(!rendererGone)web.saveState(out);super.onSaveInstanceState(out);}
    @Override protected void onPause(){super.onPause();if(!rendererGone)web.onPause();CookieManager.getInstance().flush();}
    @Override protected void onResume(){super.onResume();if(web!=null&&!rendererGone)web.onResume();}
    @Override protected void onDestroy(){closeExportPort();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null&&!rendererGone){stage.removeView(web);web.destroy();}super.onDestroy();}
}
