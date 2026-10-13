// Original, locally bundled teaching vocabulary; no password dumps or remote
// lists. Fixed word-pair patterns below are deliberately part of the vocabulary.
// ASCII spelling (ae/oe/ue/ss), at most 20 bytes, leaves room for 4 suffix digits.
const words=text=>Object.freeze(text.trim().split(/\s+/));
export const WORD_GROUPS=Object.freeze({
  priority:words(`password katharina welcome dragon monkey sunshine football letmein
    freedom secret summer winter autumn spring coffee chocolate computer internet
    keyboard penguin linux debian ubuntu arch nixos terminal museum nebby nebunix
    nebu dennis alexander michael sandra julia thomas martin anna sophie andreas
    hallo willkommen passwort geheim liebe sonne garten urlaub blume katze hund
    berlin hamburg bremen music guitar star moon planet rocket matrix wizard castle rainbow`),
  english:words(`hello friend family home house room door window garden kitchen table
    chair bed pillow blanket lamp light candle mirror clock watch book paper pencil
    letter notebook picture camera photo screen button key lock pocket bag wallet
    bottle glass cup plate spoon fork knife bread water milk tea juice honey sugar
    salt pepper butter cheese apple orange banana cherry peach pear plum lemon lime
    grape berry melon mango coconut apricot avocado carrot potato tomato onion garlic
    pumpkin spinach salad soup rice pasta pizza biscuit cookie cake cream vanilla
    cinnamon breakfast lunch dinner morning noon evening night today tomorrow yesterday
    time second minute hour day week month year weekend holiday vacation journey
    adventure travel road street bridge path train bus plane boat bicycle wheel engine
    station airport harbour ticket suitcase map compass island beach coast ocean sea
    river stream lake pond mountain valley hill forest woods meadow field flower leaf
    root branch tree grass stone rock sand snow ice frost rain cloud storm wind thunder
    lightning weather breeze season sunrise sunset dawn dusk sky space universe galaxy
    comet meteor earth mars venus mercury jupiter saturn neptune orbit eclipse horizon
    dream hope smile joy laugh peace kindness trust courage wonder luck fortune treasure
    present gift party birthday wedding festival celebration story tale poem song melody
    rhythm voice sound silence dance art drawing painting colour color shape circle square
    triangle line point number puzzle game toy card chess dice ball team match sport run
    walk jump climb swim ride drive sail fly cook bake read write learn teach build repair
    create explore discover imagine remember think listen speak share help care grow play
    work rest sleep wake start finish open close save find search connect protect change
    small large little big short long young old new clean clear warm cold hot cool soft
    hard bright dark quiet loud fast slow strong gentle wild calm happy lucky brave clever
    honest friendly patient curious careful simple golden silver northern southern eastern
    western sunny rainy snowy cloudy green blue red yellow purple pink brown black white
    amber violet indigo turquoise emerald ruby sapphire pearl diamond bronze copper steel
    iron velvet cotton silk wool leather wood metal silverlight starlight moonlight daylight
    firelight candlelight fireplace bookshelf doorstep rooftop backyard playground workshop
    campsite waterfall lighthouse sailboat snowflake seashell sunflower butterfly firefly`),
  german:words(`freund freunde familie zuhause haus wohnung zimmer tuer fenster dach boden
    wand kueche tisch stuhl bett kissen decke lampe licht kerze spiegel uhr buch papier
    stift brief heft bild kamera foto knopf schluessel schloss tasche rucksack flasche
    glas tasse teller loeffel gabel messer brot wasser milch tee saft honig zucker salz
    pfeffer butter kaese apfel birne banane kirsche pfirsich pflaume zitrone limette traube
    beere melone mango kokosnuss aprikose tomate kartoffel karotte zwiebel knoblauch kuerbis
    spinat salat suppe reis nudel pizza keks kuchen sahne vanille zimt fruehstueck mittagessen
    abendessen morgen mittag abend nacht heute morgenzeit gestern zeit sekunde minute stunde
    tag woche monat jahr wochenende feiertag reise abenteuer ausflug weg strasse bruecke pfad
    zug bahn bus flugzeug schiff boot fahrrad rad motor bahnhof flughafen hafen karte koffer
    kompass insel strand kueste ozean meer fluss bach see teich berg tal huegel wald wiese
    feld baum blatt wurzel ast gras stein fels sand schnee eis frost regen wolke sturm wind
    donner blitz wetter brise jahreszeit sonnenaufgang sonnenuntergang daemmerung himmel weltraum
    universum galaxie komet erde mond mars venus merkur saturn neptun umlaufbahn horizont traum
    hoffnung laecheln freude lachen frieden freundlichkeit vertrauen mut wunder glueck schatz
    geschenk feier geburtstag hochzeit fest geschichte maerchen gedicht lied melodie rhythmus
    stimme klang stille tanz kunst zeichnung malerei farbe form kreis quadrat dreieck linie
    punkt zahl raetsel spiel spielzeug schach wuerfel ball mannschaft sport laufen gehen
    springen klettern schwimmen fahren segeln fliegen kochen backen lesen schreiben lernen
    lehren bauen reparieren entdecken erkunden erinnern denken zuhoeren sprechen teilen helfen
    wachsen spielen arbeiten ruhen schlafen aufwachen beginnen beenden oeffnen schliessen speichern
    finden suchen verbinden schuetzen aendern klein gross kurz lang jung alt neu sauber klar
    warm kalt heiss kuehl weich hart hell dunkel leise laut schnell langsam stark sanft wild
    ruhig froh mutig klug ehrlich freundlich geduldig neugierig vorsichtig einfach golden silbern
    sonnig regnerisch verschneit wolkig gruen blau rot gelb lila rosa braun schwarz weiss bernstein
    violett tuerkis smaragd rubin saphir perle diamant bronze kupfer stahl eisen samt baumwolle
    seide wolle leder holz metall sternenlicht mondlicht tageslicht kerzenlicht kamin buecherregal
    haustuer hinterhof spielplatz werkstatt zeltplatz wasserfall leuchtturm segelboot schneeflocke
    muschel sonnenblume schmetterling gluehwuermchen regenbogen sonnenschein schneemann luftballon`),
  names:words(`aaron adam adrian alan albert alex alfred alice alicia amanda amelie amy anika
    annabel anne annika anton arthur astrid ben benjamin bernhard bettina bianca boris brigitte
    carla carlo caroline cassandra charlie charlotte christian christina christoph clara claudia
    daniel daniela david diana dieter dominik doris edith edgar elena elias elisa elisabeth ella
    emil emilia emily emma eric erik erika ernst eva evelyn fabian felix finn florian frank
    franz frieda fritz gabriel gabriela georg gerald gerhard greta hannah hans harald heidi
    helena helga henry herbert hermann holger ida ines ingrid irene isabel jakob jan jana
    janina jasmin jennifer jens jessica joachim johann johanna jonas jonathan josef joseph
    judith jule julian kai karin karl kevin klaus kristin laura lea lena leon leonard leonie
    liam linda lisa lisbeth lorenz lotta louisa lucas lucia lukas luisa luis magdalena maike
    malte manuel marc marco marie marion mark markus matilda matthias max maximilian melanie
    mia miriam monika moritz nadine natalie nico nicole nils nina noah norbert oliver oscar
    oskar otto paul paula peter petra philipp rachel ralf raphael rebecca renate richard robin
    robert ronja rosa rose ruth sabine sam samuel sarah sebastian simon sofia sonja stefan
    stephanie steven susanne sven theo tobias tom tristan ulrich uwe valentin vera victoria
    viktor vincent walter werner wilhelm william wolfgang yara yvonne zachary zoe`),
  calendar:words(`january february march april may june july august september october november
    december januar februar maerz mai juni juli oktober dezember monday tuesday wednesday
    thursday friday saturday sunday montag dienstag mittwoch donnerstag freitag samstag sonntag
    fruehling sommer herbst wochenstart wintertime summertime springtime autumntime silvester
    christmas weihnachten easter ostern newyear neujahr advent halloween carnival karneval`),
  technology:words(`software hardware firmware kernel shell bash fish zsh powershell command
    console prompt process thread worker scheduler memory ram rom cache buffer stack heap
    byte bit binary decimal hexadecimal integer float vector scalar array string object
    function module package library compiler linker debugger parser interpreter runtime
    program script source code algorithm protocol network router switch gateway firewall
    ethernet wifi wireless bluetooth fibre fiber packet frame socket port address domain
    dns dhcp http https tcp udp quic tls ssl ssh smtp imap pop3 ftp sftp ntp ipv4 ipv6
    server client browser proxy tunnel vpn tor onion subnet vlan bridge adapter driver
    graphics graphic pixel shader gpu cpu vulkan opengl webgpu webgl canvas monitor display
    desktop laptop notebook tablet smartphone mobile keyboard mouse printer scanner modem
    motherboard mainboard processor chipset socket cooler heatsink fan sensor voltage power
    battery storage disk drive hdd ssd nvme sata scsi usb pcie sdcard floppy tape backup
    archive snapshot filesystem partition volume directory folder file path symlink mount
    btrfs ext4 zfs xfs ntfs fat32 raid lvm luks encryption hash digest salt cipher keypair
    signature certificate rsa aes des sha256 argon2 bcrypt scrypt pbkdf2 passwordmanager
    passkey authentication authorization login logout account session token cookie permission
    access root admin sudo user group owner git commit branch merge rebase diff patch
    release version build test debug deploy log journal syslog systemd init service daemon
    docker podman container virtual machine hypervisor kvm qemu libvirt nix gentoo fedora
    mint opensuse freebsd openbsd netbsd unix xmonad sway wayland xorg kde gnome xfce
    cinnamon mate i3 emacs vim neovim nano vscode python javascript typescript rust golang
    ruby perl java kotlin swift csharp cpp html css xml json yaml toml sql sqlite postgres
    mysql redis nginx apache caddy openssl curl wget rsync restic tar gzip zip unzip
    netwerk netzwerk rechner bildschirm maus drucker datei ordner speicher sicherung datenbank
    schnittstelle betriebssystem programm quellcode verschluesselung zugang benutzer verwaltung`),
  nature:words(`cat dog fox wolf bear deer moose elk lion tiger leopard cheetah panther jaguar
    lynx rabbit hare squirrel hedgehog otter beaver badger raccoon panda koala kangaroo
    horse pony donkey cow calf sheep goat pig camel llama alpaca zebra giraffe elephant
    rhino hippo dolphin whale seal walrus shark fish salmon trout carp eel turtle tortoise
    frog toad lizard gecko snake python cobra eagle hawk falcon owl raven crow robin sparrow
    swallow swan goose duck heron stork crane pelican flamingo parrot peacock hummingbird
    woodpecker pheasant rooster chicken penguin puffin albatross bee bumblebee wasp ant beetle
    ladybird cricket grasshopper dragonfly firefly spider butterfly moth worm snail slug
    fuchs wolf baer reh hirsch elch loewe tiger leopard luchs hase kaninchen eichhoernchen
    igel otter biber dachs panda koala kaenguru pferd pony esel kuh schaf ziege schwein kamel
    lama zebra giraffe elefant nashorn delfin wal seehund hai fisch lachs forelle karpfen aal
    schildkroete frosch kroete eidechse gecko schlange adler falke eule rabe kraehe spatz
    schwalbe schwan gans ente reiher storch kranich pelikan flamingo papagei pfau specht
    hahn huhn pinguin biene hummel wespe ameise kaefer marienkaefer grille libelle spinne
    motte wurm schnecke rose tulip daisy lily orchid violet lavender jasmine mint basil
    sage thyme rosemary oak pine birch maple willow cedar spruce fir elm ash beech hazel
    walnut chestnut applewood tulpe gaensebluemchen lilie orchidee lavendel jasmin minze
    basilikum salbei thymian rosmarin eiche kiefer birke ahorn weide zeder fichte tanne
    ulme buche hasel walnuss kastanie moos farn moss fern blossom bud acorn seed pinecone`),
  hobbies:words(`reading writing gaming hiking camping cycling running swimming surfing sailing
    fishing climbing skiing skating dancing singing cooking baking gardening painting drawing
    photography film movie cinema theatre concert orchestra piano violin cello flute trumpet
    saxophone drums bass guitar ukulele accordion synthesizer music jazz blues rock pop folk
    classical disco techno ambient metal opera ballet yoga fitness workout marathon tennis
    badminton volleyball basketball baseball hockey cricket rugby football soccer handball
    bowling archery fencing karate judo chess checkers sudoku crossword domino puzzle lego
    model railway astronomy science history geography biology chemistry physics mathematics
    literature language poetry crafts knitting sewing woodworking pottery sculpture collecting
    retro vintage arcade pinball joystick gamepad controller puzzlebox skateboard snowboard
    lesen schreiben wandern zelten radfahren laufen schwimmen surfen segeln angeln klettern
    skifahren tanzen singen kochen backen gaertnern malen zeichnen fotografie kino theater
    konzert orchester klavier geige cello floete trompete schlagzeug gitarre akkordeon musik
    chor gesang sport training fussball handball tischtennis turnen leichtathletik fechten
    bogenschiessen schach kreuzwortraetsel modellbau modellbahn sternkunde wissenschaft geschichte
    geografie biologie chemie physik mathematik literatur sprache dichtung basteln stricken
    naehen holzarbeit toepfern sammlung computerclub spielabend lesestunde urlaubstag`),
  places:words(`london paris rome madrid lisbon vienna prague zurich oslo stockholm helsinki
    copenhagen dublin edinburgh amsterdam brussels luxembourg athens warsaw budapest venice
    florence milan naples porto barcelona valencia lyon nice bordeaux munich frankfurt cologne
    leipzig dresden bonn essen dortmund aachen kiel rostock luebeck hannover potsdam muenchen
    koeln stuttgart nuernberg freiburg heidelberg mainz wiesbaden erfurt weimar schwerin magdeburg
    oldenburg wilhelmshaven emden leer aurich wiesmoor ostfriesland niedersachsen europa europe
    africa asia america australia antarctica pacific atlantic arctic alps alpine baltic northsea
    nordsee ostsee rhein donau elbe weser ems thames seine danube rhine amazon nile`)
});
export const WORD_PAIR_PATTERNS=Object.freeze([
  {language:'en',prefixes:words('blue red green golden silver bright quiet happy lucky little big wild clever brave calm cool dark deep fast gentle hidden magic northern sunny'),
   nouns:words('cat dog fox wolf bear lion tiger rabbit horse owl eagle falcon raven swan dolphin whale dragon panda penguin turtle butterfly moon star sun comet planet galaxy sky cloud storm snow rain wind ocean sea river lake forest tree leaf flower rose lily mountain valley hill island beach stone crystal pearl diamond flame spark breeze sunrise sunset meadow castle garden rocket rainbow lantern')},
  {language:'de',prefixes:words('blauer roter gruener goldener silberner heller leiser froher kleiner grosser wilder kluger mutiger ruhiger cooler dunkler schneller sanfter versteckter magischer nordischer sonniger bunter starker'),
   nouns:words('kater hund fuchs wolf baer loewe tiger hase pferd uhu adler falke rabe schwan delfin wal drache panda pinguin frosch kaefer mond stern sonnenschein komet planet himmel wolkenhimmel sturm schnee regen wind ozean fluss see wald baum blatt garten berg huegel strand stein kristall rubin diamant funke morgen abend wasserfall leuchtturm schneemann regenbogen zauberer ritter schatz turm zug kompass sommer winter herbst fruehling spielplatz')}
]);
const dictionaryEntries=new Set();
for(const group of Object.values(WORD_GROUPS))for(const word of group){if(!/^[a-z0-9]{1,20}$/.test(word))throw new Error('Invalid bundled dictionary word: '+word);dictionaryEntries.add(word);}
const originalWords=dictionaryEntries.size;
for(const pattern of WORD_PAIR_PATTERNS)for(const prefix of pattern.prefixes)for(const noun of pattern.nouns){const word=prefix+noun;if(word.length<=20)dictionaryEntries.add(word);}
export const DICTIONARY=Object.freeze([...dictionaryEntries]);
export const DICTIONARY_META=Object.freeze({total:DICTIONARY.length,individualWords:originalWords,wordPairs:DICTIONARY.length-originalWords,languages:['en','de'],maximumBaseLength:20,ascii:true});

// Language collections are explicit editorial choices, never inferred from the
// target or UI locale. International names, place names and computing terms are
// shared intentionally. Mixed historical groups are split at documented words.
const splitAt=(group,word)=>{const i=group.indexOf(word);if(i<0)throw new Error('Missing vocabulary boundary');return [group.slice(0,i),group.slice(i)];};
const [englishTech,germanTech]=splitAt(WORD_GROUPS.technology,'netwerk');
const [englishHobbies,germanHobbies]=splitAt(WORD_GROUPS.hobbies,'lesen');
const [englishAnimals,remainingNature]=splitAt(WORD_GROUPS.nature,'fuchs');
const [germanAnimals,plants]=splitAt(remainingNature,'tulip');
const [englishPlants,remainingPlants]=splitAt(plants,'tulpe');
const [germanPlants,englishPlantTail]=splitAt(remainingPlants,'moss');
export const LANGUAGE_WORD_GROUPS=Object.freeze({
  de:Object.freeze([
    WORD_GROUPS.german,WORD_GROUPS.names,WORD_GROUPS.places,englishTech,germanTech,germanHobbies,germanAnimals,germanPlants,
    words('katharina hallo willkommen passwort geheim liebe sonne garten urlaub blume katze hund berlin hamburg bremen sommer winter herbst fruehling januar februar maerz april mai juni juli august september oktober november dezember montag dienstag mittwoch donnerstag freitag samstag sonntag wochenstart silvester weihnachten ostern neujahr advent halloween karneval'),
    words('koerper kopf auge ohr nase mund hand arm bein fuss herz haut penis')
  ]),
  en:Object.freeze([
    WORD_GROUPS.english,WORD_GROUPS.names,WORD_GROUPS.places,englishTech,englishHobbies,englishAnimals,englishPlants,englishPlantTail,
    words('password welcome dragon monkey sunshine football letmein freedom secret summer winter autumn spring coffee chocolate computer internet keyboard penguin linux debian ubuntu arch nixos terminal museum nebby nebunix nebu dennis alexander michael sandra julia thomas martin anna sophie andreas music guitar star moon planet rocket matrix wizard castle rainbow'),
    words('january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday wintertime summertime springtime autumntime christmas easter newyear advent halloween carnival'),
    words('body head eye ear nose mouth hand arm leg foot heart skin penis')
  ])
});
function languageDictionary(language){
  const entries=new Set(LANGUAGE_WORD_GROUPS[language].flat());
  const individualWords=entries.size;
  for(const pattern of WORD_PAIR_PATTERNS.filter(p=>p.language===language))for(const prefix of pattern.prefixes)for(const noun of pattern.nouns){const word=prefix+noun;if(word.length<=20)entries.add(word);}
  const values=Object.freeze([...entries]);
  if(!values.every(word=>/^[a-z0-9]{1,20}$/.test(word)))throw new Error('Invalid language dictionary');
  return {values,meta:Object.freeze({total:values.length,individualWords,wordPairs:values.length-individualWords,maximumBaseLength:20,ascii:true})};
}
const germanCollection=languageDictionary('de'),englishCollection=languageDictionary('en');
export const DICTIONARIES=Object.freeze({de:germanCollection.values,en:englishCollection.values});
export const DICTIONARY_COUNTS=Object.freeze({de:germanCollection.meta,en:englishCollection.meta});
