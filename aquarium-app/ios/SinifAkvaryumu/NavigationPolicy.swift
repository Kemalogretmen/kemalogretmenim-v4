import Foundation

enum Destination { case internalPage, externalPage, blocked }
struct NavigationPolicy {
    let host: String
    init(origin: String) { host = URL(string: origin)!.host!.lowercased() }
    func destination(_ url: URL) -> Destination {
        guard url.scheme?.lowercased() == "https", let current = url.host?.lowercased(), url.user == nil, url.password == nil else { return .blocked }
        guard current == host || current == "www." + host else { return .externalPage }
        guard url.port == nil || url.port == 443 else { return .externalPage }
        let raw = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath ?? "/"
        guard !raw.contains("%"), !raw.contains("\\"), !raw.contains("//"), !raw.split(separator: "/").contains(".."), !raw.split(separator: "/").contains(".") else { return .blocked }
        var path = raw.isEmpty ? "/" : raw
        if path.hasSuffix("/") && path.count > 1 { path.removeLast() }
        return ["/ogretmen/akvaryum", "/ogretmen/akvaryum.html", "/giris", "/giris.html"].contains(path) ? .internalPage : .externalPage
    }
}
