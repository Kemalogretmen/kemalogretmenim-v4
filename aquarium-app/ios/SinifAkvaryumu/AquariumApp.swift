import SwiftUI
import UIKit
import WebKit
import UniformTypeIdentifiers

struct AppConfig: Decodable {
    let name, brand, version, siteOrigin, aquariumPath: String
    static let current: AppConfig = {
        let url = Bundle.main.url(forResource: "app-config", withExtension: "json")!
        return try! JSONDecoder().decode(AppConfig.self, from: Data(contentsOf: url))
    }()
    var aquariumURL: URL { URL(string: siteOrigin + aquariumPath)! }
}

@main struct AquariumApp: App {
    var body: some Scene { WindowGroup { AquariumScreen() } }
}
private let sea = Color(red: 8/255, green: 47/255, blue: 61/255)
private let mint = Color(red: 160/255, green: 234/255, blue: 200/255)

struct BackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: data) }
}

struct AquariumScreen: View {
    @StateObject private var model = AquariumWebModel()
    @State private var about = false
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "fish").font(.system(size: 27)).foregroundStyle(mint).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Sınıf Akvaryumu").font(.system(size: 17, weight: .bold)).lineLimit(1)
                    Text("KEMAL ÖĞRETMENİM").font(.system(size: 9, weight: .semibold)).tracking(1.3).foregroundStyle(mint)
                }
                Spacer(minLength: 4)
                Button { model.openHome() } label: { Image(systemName: "house").font(.system(size: 21)).frame(width: 44, height: 44) }
                    .accessibilityLabel("Ana sayfa · Varsayılan tarayıcıda aç")
                Menu {
                    Button { model.reload() } label: { Label("Akvaryumu yenile", systemImage: "arrow.clockwise") }
                    Button { model.openBrowser() } label: { Label("Akvaryumu tarayıcıda aç", systemImage: "safari") }
                    Button { model.demo() } label: { Label("Örnek sınıfı keşfet", systemImage: "fish") }
                    Button { about = true } label: { Label("Uygulama hakkında", systemImage: "info.circle") }
                } label: { Image(systemName: "ellipsis").font(.system(size: 22)).frame(width: 44, height: 44) }
                .accessibilityLabel("Diğer seçenekler")
            }
            .padding(.horizontal, 12).padding(.vertical, 4).foregroundStyle(.white).background(sea)
            ProgressView(value: model.progress).tint(mint).opacity(model.loading ? 1 : 0).frame(height: 3)
            ZStack {
                AquariumWebView(model: model)
                if let error = model.error {
                    VStack(spacing: 18) {
                        Image(systemName: "fish").font(.system(size: 64)).foregroundStyle(mint)
                        Text("Akvaryumu yeniden açalım").font(.title2.bold())
                        Text(error).multilineTextAlignment(.center).foregroundStyle(.white.opacity(0.8))
                        Button("Yeniden dene") { model.reload() }.buttonStyle(.borderedProminent).tint(mint).foregroundStyle(sea)
                    }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(.white).background(sea)
                }
            }
        }
        .background(sea).preferredColorScheme(.dark)
        .alert("Sınıf Akvaryumu", isPresented: $about) {
            Button("Tamam", role: .cancel) { }
        } message: {
            Text("Kemal Öğretmenim · \(AppConfig.current.version)\n\nTelefon ve tablet için sınıfınızın su altı dünyası. Canlı akvaryum kullanılır; ilk açılış ve hesap eşitlemesi internet gerektirir.\n\nTarayıcı ve uygulama oturumları ayrı saklanır. Bir kez e-posta ve şifrenizle giriş yapın. Ana sayfa cihazın varsayılan tarayıcısında açılır.")
        }
        .fileExporter(isPresented: $model.exportRequested, document: model.backup, contentType: .json, defaultFilename: model.backupName) { result in
            model.backup = nil
            if case .failure = result { model.error = "Yedek kaydedilemedi. Tarayıcıda açarak yeniden deneyebilirsiniz." }
        }
    }
}

struct AquariumWebView: UIViewRepresentable {
    let model: AquariumWebModel
    func makeUIView(context: Context) -> WKWebView { model.web }
    func updateUIView(_ view: WKWebView, context: Context) { }
}

final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: AquariumWebModel?
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) { target?.receive(message) }
}

final class AquariumWebModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var loading = true
    @Published var progress = 0.0
    @Published var error: String?
    @Published var exportRequested = false
    @Published var backup: BackupDocument?
    var backupName = "sinif-akvaryumu-yedek.json"
    let web: WKWebView
    private var observation: NSKeyValueObservation?
    private let config = AppConfig.current
    private lazy var policy = NavigationPolicy(origin: config.siteOrigin)
    private let handler = WeakScriptHandler()

    override init() {
        let setup = WKWebViewConfiguration()
        setup.websiteDataStore = .default()
        setup.allowsInlineMediaPlayback = true
        setup.mediaTypesRequiringUserActionForPlayback = .all
        setup.defaultWebpagePreferences.preferredContentMode = .mobile
        setup.applicationNameForUserAgent = "SinifAkvaryumu/1.0 iOS"
        let scriptURL = Bundle.main.url(forResource: "mobile-shell", withExtension: "js")!
        let script = try! String(contentsOf: scriptURL, encoding: .utf8)
        setup.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: setup)
        super.init()
        handler.target = self
        setup.userContentController.add(handler, name: "aquariumShell")
        web.navigationDelegate = self; web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false; web.backgroundColor = UIColor(red: 8/255, green: 47/255, blue: 61/255, alpha: 1)
        web.scrollView.backgroundColor = web.backgroundColor
        observation = web.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
            DispatchQueue.main.async { self?.progress = view.estimatedProgress }
        }
        web.load(URLRequest(url: config.aquariumURL))
    }
    func openHome() { UIApplication.shared.open(URL(string: config.siteOrigin + "/")!) }
    func openBrowser() { UIApplication.shared.open(config.aquariumURL) }
    func reload() { error = nil; loading = true; if let url = web.url, policy.destination(url) == .internalPage { web.reload() } else { web.load(URLRequest(url: config.aquariumURL)) } }
    func demo() { error = nil; web.load(URLRequest(url: URL(string: config.siteOrigin + config.aquariumPath + "?demo=1")!)) }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if action.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        let destination = policy.destination(url)
        if destination == .internalPage && action.targetFrame != nil { decisionHandler(.allow); return }
        if destination != .blocked && action.navigationType == .linkActivated { UIApplication.shared.open(url) }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true; error = nil }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loading = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError value: Error) { failed(value) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError value: Error) { failed(value) }
    private func failed(_ value: Error) {
        if (value as NSError).code == NSURLErrorCancelled { return }
        loading = false; error = "İnternet bağlantınızı kontrol edip yeniden deneyin. Hesabınız ve cihazdaki kayıtlarınız silinmedi."
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { loading = false; error = "Cihaz görüntüyü yenilemek istiyor. Kayıtlarınız korunuyor." }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.isForMainFrame, let http = response.response as? HTTPURLResponse, http.statusCode >= 400 {
            loading = false; error = "Akvaryum şu an açılamıyor. Biraz sonra yeniden deneyin."; decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Sınıf Akvaryumu", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Tamam", style: .default) { _ in completionHandler() })
        if !present(alert) { completionHandler() }
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "Sınıf Akvaryumu", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Vazgeç", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Tamam", style: .default) { _ in completionHandler(true) })
        if !present(alert) { completionHandler(false) }
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: "Sınıf Akvaryumu", message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Vazgeç", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "Tamam", style: .default) { [weak alert] _ in completionHandler(alert?.textFields?.first?.text) })
        if !present(alert) { completionHandler(nil) }
    }
    private func present(_ controller: UIViewController) -> Bool {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({$0 as? UIWindowScene}).first,
              let root = scene.windows.first(where: {$0.isKeyWindow})?.rootViewController else { return false }
        var top = root; while let shown = top.presentedViewController { top = shown }; top.present(controller, animated: true); return true
    }
    func receive(_ message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame, origin.protocol == "https", (origin.port == 0 || origin.port == 443),
              ["kemalogretmenim.com.tr", "www.kemalogretmenim.com.tr"].contains(origin.host),
              let url = web.url, policy.destination(url) == .internalPage,
              let object = message.body as? [String: Any], object["type"] as? String == "exportBackup",
              let text = object["contents"] as? String, let data = text.data(using: .utf8), data.count <= 5 * 1024 * 1024,
              let document = try? JSONSerialization.jsonObject(with: data) as? [String: Any], document["classes"] != nil, !exportRequested else { return }
        backupName = (object["name"] as? String ?? "sinif-akvaryumu-yedek.json").replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
        if !backupName.hasSuffix(".json") { backupName += ".json" }
        backup = BackupDocument(data: data); exportRequested = true
    }
    deinit { web.configuration.userContentController.removeScriptMessageHandler(forName: "aquariumShell"); observation?.invalidate() }
}
