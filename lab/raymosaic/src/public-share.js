// Public product links only. Never include location.hash or a private project payload.
export const PUBLIC_PAGES=Object.freeze({
 en:'https://www.dennishilk.com/lab/raymosaic/',
 de:'https://www.dennishilk.com/de/lab/raymosaic/'
});
export function publicPageUrl(lang='en'){return PUBLIC_PAGES[lang==='de'?'de':'en'];}
export function publicShareText(lang='en'){return lang==='de'?'448 Spiegel. Eine Lichtquelle. Gestalte Bilder aus reflektiertem Licht mit RAYMOSAIC ❤️✨':'448 mirrors. One light. Draw with reflected light in RAYMOSAIC ❤️✨';}
export function shareServiceUrl(service,lang='en'){
 const url=publicPageUrl(lang),message=publicShareText(lang);
 switch(service){
 case 'whatsapp':return 'https://api.whatsapp.com/send?text='+encodeURIComponent(message+' '+url);
 case 'facebook':return 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
 case 'x':return 'https://twitter.com/intent/tweet?text='+encodeURIComponent(message)+'&url='+encodeURIComponent(url);
 case 'email':return 'mailto:?subject='+encodeURIComponent('RAYMOSAIC — Draw with light')+'&body='+encodeURIComponent(message+'\n'+url);
 default:throw Error('Unknown share service');
 }
}
export function mastodonShareUrl(instance,lang='en'){
 const hostname=String(instance||'').trim().toLowerCase();
 // Accept a hostname only; never trust a scheme/path or userinfo in a custom instance.
 if(hostname.length>120||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname))throw Error('Enter a Mastodon instance hostname, e.g. mastodon.social');
 return 'https://'+hostname+'/share?text='+encodeURIComponent(publicShareText(lang)+'\n'+publicPageUrl(lang));
}
