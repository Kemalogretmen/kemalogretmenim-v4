package tr.com.kemalogretmenim.aquarium;

import java.net.URI;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

/** Main-frame navigation only; authentication cookies never leave WebView. */
public final class NavigationPolicy {
    public enum Destination { INTERNAL, EXTERNAL, BLOCK }
    private final String host;
    private static final Set<String> INTERNAL_PATHS = new HashSet<>(Arrays.asList(
        "/ogretmen/akvaryum", "/ogretmen/akvaryum.html", "/giris", "/giris.html"
    ));
    public NavigationPolicy(String origin) { host = URI.create(origin).getHost(); }
    public boolean isSite(String value) {
        try {
            URI u = new URI(value);
            return "https".equalsIgnoreCase(u.getScheme()) && u.getUserInfo() == null
                && (u.getPort() == -1 || u.getPort() == 443)
                && (host.equalsIgnoreCase(u.getHost()) || ("www." + host).equalsIgnoreCase(u.getHost()));
        } catch (Exception e) { return false; }
    }
    public Destination destination(String value) {
        try {
            URI u = new URI(value);
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || u.getUserInfo() != null)
                return Destination.BLOCK;
            if (!isSite(value)) return Destination.EXTERNAL;
            String path = u.getRawPath();
            if (path == null) path = "/";
            if (path.contains("%") || path.contains("\\") || path.contains("//") || !(u.normalize().getRawPath() == null ? "/" : u.normalize().getRawPath()).equals(path))
                return Destination.BLOCK;
            if (path.endsWith("/") && path.length() > 1) path = path.substring(0, path.length() - 1);
            return INTERNAL_PATHS.contains(path) ? Destination.INTERNAL : Destination.EXTERNAL;
        } catch (Exception e) { return Destination.BLOCK; }
    }
}
