package tr.com.kemalogretmenim.aquarium;

import java.net.URI;
import java.util.Locale;

/** Only a pupil-specific access code can enter the Android share/clipboard UI. */
public final class ParentAccess {
    public final String studentName, className, code, url;
    public ParentAccess(String studentName,String className,String code,String url) {
        if(code==null || !code.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}"))throw new IllegalArgumentException();
        try {
            URI link=new URI(url);
            String host=link.getHost()==null?"":link.getHost().toLowerCase(Locale.ROOT);
            if(!"https".equals(link.getScheme()) || !(host.equals("kemalogretmenim.com.tr")||host.equals("www.kemalogretmenim.com.tr"))
                || (link.getPort()!=-1&&link.getPort()!=443) || link.getUserInfo()!=null || link.getFragment()!=null
                || !link.getPath().matches("/ogretmen/akvaryum(?:\\.html)?/?") || !("cocuk="+code).equals(link.getRawQuery()))throw new IllegalArgumentException();
        }catch(Exception e){throw new IllegalArgumentException("Geçersiz veli bağlantısı");}
        this.studentName=clean(studentName);this.className=clean(className);this.code=code;this.url=url;
    }
    private static String clean(String value){
        if(value==null)throw new IllegalArgumentException();
        String result=value.replaceAll("[\\p{Z}\\s]+"," ").trim();
        if(result.isEmpty()||result.length()>80||result.chars().anyMatch(Character::isISOControl))throw new IllegalArgumentException();
        return result;
    }
    public String message(){return "Merhaba,\n"+studentName+" için "+className+" Sınıf Akvaryumu veli erişimi:\n\nVeli kodu: "+code+"\nBağlantı: "+url+"\n\nBu kod yalnızca ilgili veliye özeldir. Lütfen başkalarıyla paylaşmayın.";}
    public String copyText(String format){
        switch(format){case "code":return code;case "url":return url;case "message":return message();default:throw new IllegalArgumentException();}
    }
}
