// Read only the existing same-origin World Observer export. Never call its provider.
export const WEATHER_URL = '/world-observer/dashboard/latest/wiesmoor-weather.json';
export const weatherLink = lang => lang === 'de' ? '/de/world-observer/wiesmoor-weather.html' : '/world-observer/wiesmoor-weather.html';
const fields = ['year','month','day','hour','minute','second'];
function parts(date,zone) {
  const p = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(p.filter(p=>fields.includes(p.type)).map(p=>[p.type,Number(p.value)]));
}
function wallKey(ms,zone) { const p=parts(ms,zone);return fields.map(k=>p[k]).join('-'); }
export function zonedTimestamp(value,zone='Europe/Berlin') {
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) { const n=Date.parse(value);return Number.isFinite(n)?n:null; }
  const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?$/.exec(value);
  if (!m || zone !== 'Europe/Berlin') return null;
  const a=m.slice(1).map(v=>Number(v||0)), wanted=a.join('-');
  const utc=Date.UTC(a[0],a[1]-1,a[2],a[3],a[4],a[5]); let guess=utc;
  for(let i=0;i<3;i++){const p=parts(guess,zone);guess+=utc-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}
  if(wallKey(guess,zone)!==wanted) return null; // invalid dates or spring DST gap
  if(wallKey(guess-3600000,zone)===wanted || wallKey(guess+3600000,zone)===wanted)return null; // ambiguous autumn hour
  return guess;
}
const valid = (v,min,max) => typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
export function weatherReply(raw,{kind='current',language='de',now=Date.now()}={}) {
  const de=language==='de', t=(g,e)=>de?g:e, source={label:'Wiesmoor Weather Observer',url:weatherLink(language)};
  const result=(text,status)=>({text,kind:'weather',status,sources:[source]});
  const absent=()=>result(t('Mein Wetterbericht ist gerade nicht verfügbar. Schau beim Wiesmoor Observer vorbei. Ich erfinde keine Werte.','My weather report is unavailable right now. Try the Wiesmoor Observer; I won’t invent any readings.'),'unavailable');
  if(!raw || raw.observer!=='wiesmoor-weather' || !['ok','partial'].includes(raw.data_status) || raw.location?.timezone!=='Europe/Berlin')return absent();
  if(raw.location?.latitude!==undefined && (!valid(raw.location.latitude,53.3,53.5)||!valid(raw.location.longitude,7.6,7.9)))return absent();
  const collected=zonedTimestamp(raw.collected_at_utc), measured=zonedTimestamp(raw.current?.time,raw.location.timezone);
  const stamp=ms=>new Intl.DateTimeFormat(de?'de-DE':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(ms)+' (Europe/Berlin)';
  const age=ms=>ms===null?Infinity:now-ms;
  if(!Number.isFinite(now) || collected===null || age(collected)<-600000)return absent();
  const stale=()=>result(t(`Mein Wetterbericht vom ${stamp(collected)} ist für diese Frage zu alt. Bitte prüfe den Wiesmoor Observer.`,`My weather report from ${stamp(collected)} is too old for this question. Please check the Wiesmoor Observer.`),'stale');
  const n=v=>new Intl.NumberFormat(de?'de-DE':'en-GB',{maximumFractionDigits:1}).format(v);
  if(kind==='tomorrow') {
    if(age(collected)>26*3600000)return stale();
    const p=parts(now,'Europe/Berlin'), day=new Date(Date.UTC(p.year,p.month-1,p.day+1)).toISOString().slice(0,10);
    const d=raw.daily, index=Array.isArray(d?.time)?d.time.indexOf(day):-1;
    if(index<0 || !valid(d.temperature_2m_min?.[index],-90,60)||!valid(d.temperature_2m_max?.[index],-90,60)||d.temperature_2m_min[index]>d.temperature_2m_max[index])return absent();
    const lo=n(d.temperature_2m_min[index]), hi=n(d.temperature_2m_max[index]);
    const precipitation=valid(d.precipitation_sum?.[index],0,1000)?t(` Erwartete Tagesniederschlagssumme: ${n(d.precipitation_sum[index])} mm.`,` Expected daily precipitation: ${n(d.precipitation_sum[index])} mm.`):'';
    return result(t(`Vorhersage für Wiesmoor am ${day}: ${lo} bis ${hi} °C.${precipitation} Prognosebericht vom ${stamp(collected)}; keine aktuelle Messung und keine Garantie.`,`Forecast for Wiesmoor on ${day}: ${lo} to ${hi} °C.${precipitation} Forecast report from ${stamp(collected)}; not a current observation or a guarantee.`),'forecast');
  }
  if(measured===null || age(measured)<-600000)return absent();
  if(age(collected)>3*3600000 || age(measured)>3*3600000)return stale();
  const c=raw.current;
  // Units are the inspected collector contract; reject explicit incompatible units.
  const units=raw.current_units;
  if(units && ((units.temperature_2m && units.temperature_2m!=='°C')||(units.wind_speed_10m && units.wind_speed_10m!=='km/h')||(units.rain && units.rain!=='mm')))return absent();
  let info=[];
  if(kind==='current'||kind==='temperature')if(valid(c.temperature_2m,-90,60))info.push(t(`${n(c.temperature_2m)} °C Temperatur`,`${n(c.temperature_2m)} °C temperature`));
  if(kind==='current'||kind==='rain')if(valid(c.rain,0,500))info.push(t(`${n(c.rain)} mm Regen im gemeldeten Zeitintervall`,`${n(c.rain)} mm rain in the reported interval`));
  if(kind==='current'||kind==='wind')if(valid(c.wind_speed_10m,0,400))info.push(t(`${n(c.wind_speed_10m)} km/h Wind`,`${n(c.wind_speed_10m)} km/h wind`));
  if(!info.length)return absent();
  return result(t(`Letzter modellbasierter Wetterbericht für Wiesmoor, Stand ${stamp(measured)}: ${info.join('; ')}. Abgerufen vom Observer am ${stamp(collected)}. Kein Live-Sensor bei mir am Fenster.`,`Latest model-based weather report for Wiesmoor, valid ${stamp(measured)}: ${info.join('; ')}. Collected by the Observer at ${stamp(collected)}. I don’t have a live sensor outside my window.`),'current');
}
export function createWeatherReader(fetcher=fetch) {
  let cached, fetched=0;
  return async options=>{
    if(!cached || Date.now()-fetched>60000) {
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),6000);
      try {
        const r=await fetcher(WEATHER_URL,{cache:'no-store',signal:controller.signal,redirect:'error'});
        if(!r.ok)throw new Error('WEATHER_UNAVAILABLE');
        const text=await r.text();if(text.length>250000)throw new Error('WEATHER_TOO_LARGE');
        cached=JSON.parse(text);fetched=Date.now();
      }catch {cached=null;}finally{clearTimeout(timer);}
    }
    return weatherReply(cached,options);
  };
}
