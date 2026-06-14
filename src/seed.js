const bcrypt = require('bcryptjs');
const db = require('./db');

const PW = process.env.SEED_DEFAULT_PASSWORD || 'Schatten2078';
const hash = bcrypt.hashSync(PW, 10);
const now = () => new Date().toISOString();

// ---------- USERS (per Spieler, Benjamin & Alex = SL) ----------
const users = [
  ['benjamin', 'Benjamin', 'sl'],
  ['alex', 'Alex', 'sl'],
  ['patric', 'Patric', 'player'],
  ['sigi', 'Sigi', 'player'],
  ['max', 'Max', 'player'],
  ['moritz', 'Moritz', 'player'],
];
const insUser = db.prepare(`INSERT OR IGNORE INTO users (username, display_name, role, password_hash, must_change) VALUES (?,?,?,?,1)`);
for (const [u, d, r] of users) insUser.run(u, d, r, hash);

// ---------- CHARACTERS ----------
const characters = [
  ['buffy','Buffy','Benjamin','Mensch (Albino), 28','Magierin — Geisterbeschwörerin & -jägerin',
   'Erwacht, hermetisch (Materialization), Initiation 1, Mentor „Brother at Arms“, Ehrenkodex Schutz Unschuldiger; 4 gebundene Geister.',
   'Albino mit pinkem Haar, akademisch (Metaebenen, Parabiologie), Beschützer-Ethos. Handicap „verträgt nichts“.',
   'Waffenfokus-Rapier, amphibisches Fahrzeug, mobile Medi-Hütte.',
   '12.000¥ Schulden bei Pozi (Beschwörungsmaterial).',
   'Pozi (Taliskrämerin, Gläubigerin), Sabrina (Schieberin)',10],
  ['kapitaen-flint','Kapitän Flint','Benjamin','Ork (Satyr), 31','Rigger / Schmuggler (Piratenthema)',
   'Mundan (stark verkybert).',
   'Piraten-Kapitän, wohnt in Stade, Faible für Piraten-Rock. Qualität „Alternative Fakten“.',
   'U-Boot „Black Pearl“, Geschütze, Riggerkontrolle.',
   'U-Boot + Elbe-Schmugglernetz als Asset.',
   'Horst „Schelle“ Neumeister (Mechaniker), Laura Kowalski (Club), Samanta (Barkeeperin Stade)',11],
  ['kiezchronist','KiezChronist','Benjamin','Elf, 35','Decker / Infobroker',
   'Mundan. Simrig (Sim-Aufnahmen).',
   'Kiez-Informant mit riesigem Kontaktnetz, legaler Hamburger SIN, lebt prekär als Squatter.',
   'Cyberaugen/-ohren, Datenbuchse Plus, Simrig.',
   'Verschuldet (Stufe 13); legale SIN = aufspürbar.',
   'Großteils archetypisch (Gangboss, Informationshändler, Konzernmann, Hehler, Pirat …)',12],
  ['mondkind','Mondkind','Alex','Elf, 36','Vollzauberer „Storyteller“ (sozial/Ritual)',
   'Erwacht, Tradition Storyteller (Materialization), Initiation 2; Nähe zur Geisterbesessenheit.',
   'Findelkind aus dem Hain der Kreativität (Pomorya), später Hof Teleam/DeMeKo. Charmanter Romantiker, 20.-Jh.-Look, Schwertstock.',
   'Gehstock-Degen.',
   'Anbindung DeMeKo/Hof Teleam/Pomorya; Hang zur Geisterbesessenheit.',
   'Myriam Teleam (DeMeKo), Mama Mamba, Warentester Klaas (Likedeeler), Verena „Undine“ Glaser (Klabauterbund) u.v.m.',20],
  ['al-be-rich','Al-Be-Rich','Alex','Zwerg/Gnom, 41','Technomancer / Mechaniker-Allrounder',
   'Technomancer, Resonanz 4; seltene Komplexe Form „Coriolis“.',
   'Außenseiter aus Chicago, paranoid, Eigenbrötler, Leistungsdrogen per Implant.',
   'Ares Roadmaster — amphibische rollende Werkstatt/Basis; gefälschte SINs.',
   'Tief bei der Vory verschuldet; Konzern-Kopfgeld; will eine anthropomorphe Drohne bauen.',
   'Horst „Schelle“ Neumeister (Mechaniker), Mr. Ming (Schieber), Senator Julian von Ahrensburg',21],
  ['seven-lifes','Seven Lifes','Alex','Mensch (Sachse), 36','Decker (drogen-/talentgestützt), Drohnen',
   'Mundan; Talentleitungen, Cyberarm & -bein (Vory-Ware).',
   'Chemiestudium → Zeta-ImpChem Berlin; waffenaffin; zog Berlin→Hamburg.',
   'MCT Fly-Spy Drohne, Cyberarm/-bein, Decker-Suite.',
   '20-J-Lockvertrag Z-IC; Arbeitsunfall; mit Vory-Hilfe geflohen → Schulden; Z-IC-Kopfgeld.',
   'Dr. Bisam (Straßendoc), Warentester Claas (Likedeeler), Phobos (Schieber Berlin), Björn Halter (Büchsenmacher)',22],
  ['bull','Bull','Sigi','Troll/Minotaurus, 17','Nahkampf-Adept & Schamane',
   'Erwacht, schamanisch (Materialization), Mentor Beasts.',
   'Junger Minotaur aus dem Alten Land, tier-/naturverbunden, Hund „Frodo“; tagsüber Türsteher.',
   'Gehörnter Nahkampf „Goring Horns“, traditioneller Bogen St.8.',
   'Sehr jung (17); Maria Juanes als möglicher Verräter-Kontakt.',
   'Dr. Bisam, Käpt’n Svenja, Laura Kowalski, Maria Juanes (Konzern-Headhunterin), Matthias Tiefenried, Frodo (Hund)',30],
  ['ermina','Ermina','Sigi','Elf, 23','Face (Influence 6, ~9 Sprachen)',
   'Mundan.',
   'Aristokratische, vielsprachige High-Society-Verhandlerin & Infiltratorin; Oberschicht.',
   '—',
   'Familien-Aufhänger (Reanka); Kaltenstein-Patronage als Hebel.',
   'Elyria Reanka (vermutlich Familie), Kaltenstein (Großer Drache, Feldberg)',31],
  ['walpurga','Walpurga','Sigi','Mensch, 28','Heil-/Support-Magierin (Hexe)',
   'Erwacht, Tradition Brockenhexen (Materialization), Initiation 1, Abwehrmagie.',
   'Rothaarige Hexe eines Zirkels; schlechter Ruf 1; Mittelschicht.',
   '—',
   'Verpflichtung gegenüber dem Hexenzirkel „Brokenhexen“.',
   'Brokenhexen (Hexenzirkel), WG-Sani, WG-Studi',32],
  // Stubs (Bögen folgen)
  ['multitool','Multitool','Patric','—','—',
   '—','Bogen folgt.','—','Connection: ein Hacker-Kontakt (in Run 1 am Sperrwerk genutzt).','Hacker-Kontakt (Name folgt)',40],
  ['sparks','Sparks','Max','Hobgoblin','Chaosmagier',
   'Erwacht (Chaosmagier).','War in der Clubnacht; kennt Multitool. Bogen folgt.','—','—','Multitool',41],
  ['ronin','Ronin','Max','Mensch (schwer cybered, Essenz ~2,2)','Street Samurai',
   'Mundan; stark verkybert.',
   'Herrenloser Samurai (Kaori Sato). Schnell und toedlich im Nahkampf und mit Schusswaffen, Akrobatik und Infiltration. Lebt auf einem Hotelschiff. In Run 2 in Bisams Klinik dazugestossen.',
   'Klingenwaffen + Ares Crusader II u.a.; mehrere Initiative-Durchgaenge.',
   'Werte aus handschriftlichem Bogen — Details ggf. von Max bestaetigen.',
   'Mehrere: Schieber, Waffenhaendler, Rettungssanitaeter, Fixerin (Loyalitaet/Einfluss notiert)',42],
  ['patchdoc','PatchDoc','Max','Xenosapient (erwachte KI)','Magischer Strassendoc + Tech/Decker',
   'Erwacht (Magie 6).',
   'Magischer Strassendoc mit Tech-/Decker-Schlag: Medizin, Erste Hilfe, Computer/Hardware/Software, Hacking, eigenes Cyberdeck. Heiler/Support + Technik.',
   'Cyberdeck, Fahrzeug.',
   'Eine erwachte KI als Strassendoc. Magische Tradition und Kontakte noch offen.',
   '—',44],
  ['random','Random','Moritz','—','—',
   '—','Bogen folgt.','—','—','—',43],
];
const insChar = db.prepare(`INSERT OR IGNORE INTO characters (slug,name,player,metatype,archetype,magic,profile,signature,hooks,contacts,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const upChar = db.prepare(`UPDATE characters SET name=?,player=?,metatype=?,archetype=?,magic=?,profile=?,signature=?,hooks=?,contacts=?,sort=? WHERE slug=?`);
for (const c of characters){ insChar.run(...c); upChar.run(c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],c[9],c[10],c[0]); }

// ---------- CONNECTIONS (Spielerwissen, keine Plot-Geheimnisse) ----------
const connections = [
  ['dr-bisam','Dr. Bisam','Straßendoc','Mandelzirkel / Ghule (Verbündete)','Steilshoop, an der Friedhofsmauer','Behandelt jeden ohne SIN-Fragen; Barzahlung; Zigaretten','Verbündeter',
   'Versorgte das Wattsammler-Mädchen Juna nach Run 1 und gab der Gruppe in Run 2 den Auftrag, Medikament zu beschaffen. Klinik wurde von Profis angegriffen.','Bull, Seven Lifes',1],
  ['svenja','Käpt’n Svenja','Likedeeler-Kapitänin','Likedeeler (Verbündete)','Dock 4, Finkenwerder','Freiheit der Elbe; hält ihr Wort','Verbündete',
   'Warnte die Gruppe in Run 1 vor Vester, heuerte sie an und nahm die verschleierte Kiste in Verwahrung.','Bull',1],
  ['senator-von-ahrensburg','Senator Julian von Ahrensburg','Lokalpolitiker / Gesicht der Ältermänner','Ältermänner','Speicherstadt / Rathaus','Hanseatische Diskretion; zahlt gut','Kontakt',
   'Einflussreicher Strippenzieher der alten Hamburger Garde.','Al-Be-Rich',1],
  ['kaltenstein','Kaltenstein','Großer westlicher Drache','Bewahrer','Feldberg','Stabilität, langfristiges Spiel','Patron (sehr distanziert)',
   'Ein Drache als Connection — außergewöhnlich. Kommuniziert selten und nie umsonst.','Ermina',1],
  ['seedrachin','Seedrachin','Große Drachin (Meer)','Naturgewalt','Nordsee / Watt','Reinheit der See','Unberechenbar',
   'Manifestierte sich in Run 1 als gewaltiger Wasser-Avatar.','Mondkind',1],
  ['mama-mamba','Mama Mamba','Voodoo-Priesterin','Mandelzirkel','Altona','Spirituelles Gleichgewicht','Kontakt',
   'Kennt die alten Geschichten und Prophezeiungen der Stadt.','Mondkind',1],
  ['warentester-klaas','Warentester Klaas','Schieber / Chef der Hamburger Likedeeler','Likedeeler','Hamburg/Hafen','Loyalität zur See, gute Geschäfte','Kontakt',
   'Zentrale Likedeeler-Figur und Job-Vermittler.','Mondkind, Seven Lifes',1],
  ['myriam-teleam','Myriam Teleam','CEO DeMeKo & Kurfürstin','Pomorya / DeMeKo','Pomorya','Macht, elfische Politik','Hochrangiger Kontakt',
   'Spitze des elfischen Establishments — über Mondkind erreichbar.','Mondkind',1],
  ['undine-glaser','Verena „Undine“ Glaser','Hooderin beim Klabauterbund','Klabauterbund','Hafen','Wasser-Mystik','Kontakt',
   'Verbindung in den Klabauterbund.','Mondkind',0],
  ['schelle-neumeister','Horst „Schelle“ Neumeister','Mechaniker (Drohnen)','—','Altona','Saubere Arbeit, alte Schule','Kontakt',
   'Geteilter Schrauber der Gruppe.','Al-Be-Rich, Kapitän Flint',0],
  ['laura-kowalski','Laura Kowalski','Club-Besitzerin','—','Hamburg / Stade','Diskretion, Stammgäste','Kontakt',
   'Gemeinsame Anlaufstelle/Treffpunkt.','Bull, Kapitän Flint',0],
  ['pozi','Pozi','Taliskrämerin','—','Neue Mitte','Bezahlung pünktlich','Gläubigerin',
   'Buffy schuldet ihr 12.000¥ für Beschwörungsmaterial.','Buffy',0],
  ['maria-juanes','Maria Juanes','Konzern-Headhunterin','Konzern','Hamburg','Talente abwerben','Unzuverlässig (geringe Loyalität)',
   'Vorsicht: möglicher Verräter-Kontakt.','Bull',0],
  ['multitool-hacker','Multitools Hacker-Kontakt','Hacker','—','Hamburg (Matrix)','—','Kontakt (Name folgt)',
   'Half der Gruppe in Run 1, am Sperrwerk ins System einzugreifen — nur knapp gelungen.','Multitool',0],
];
const insConn = db.prepare(`INSERT OR IGNORE INTO connections (slug,name,role,faction,location,preferences,status,history,shared_by,campaign_relevant) VALUES (?,?,?,?,?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM connections').get().c === 0)
  for (const c of connections) insConn.run(...c);

// ---------- RUNS (spielerseitige Zusammenfassungen, spoilerfrei) ----------
const runs = [
  ['run-0','Run 0','Die undichte Stelle','Vor dem Orkan „Njord“','Random, Multitool, Mondkind',
   'Konsul Groot heuerte die Runner in der Elbphilharmonie an, einen abtrünnigen Proteus-Analysten — Dr. Arvid Foss — aus einem stillgelegten Pumpwerk in Wilhelmsburg zu holen, bevor der Konzern ihn zum Schweigen brachte. Während draußen die Flut stieg, verteidigten die Runner Foss gegen ein Proteus-Eingreifteam, töteten mehrere der Operativen und brachten ihn samt seinem Datenchip sicher zum „Klabautermann“. Auf dem Chip ein Codewort: „Medusa“. Beim Katerfrühstück im Diner stießen Sparks und Bull dazu — und die Runde war sich einig: Man kann die Menschen nicht einfach absaufen lassen.',
   '[]',10],
  ['run-1','Run 1','Das Auge des Sturms','Orkan „Njord“, Nacht','Random, Multitool, Mondkind, Bull, Sparks',
   'Im „Klabautermann“ bot der Ork Jens „Haifisch“ Vester einen zwielichtigen Bergungsjob an — die Runner lehnten ab. Auf eigene Faust steuerten sie ein Sperrwerk an und brachten mit dem Hacker-Kontakt von Multitool die Flutschutztore gerade noch unter Kontrolle. Dann nahmen sie Käpt’n Svenjas Auftrag an und fuhren raus aufs Watt, zu einem alten Flak-Turm voller Wattsammler. Dort fanden sie ein seltsames, „singendes“ Objekt — und gerieten zwischen die Roten Korsaren und etwas weit Größeres: einen gewaltigen Avatar aus Wasser, der die Angreifer verschlang. Sie töteten den Korsaren-Anführer, retteten die Wattsammler und übergaben die magisch verschleierte Kiste an Svenja. Das Mädchen Juna kam zu Dr. Bisam.',
   '[]',20],
  ['run-2','Run 2','Kein Ort zum Heilen','Der Morgen nach dem Sturm','Bull, Mondkind, Ronin, Multitool',
   'In Dr. Bisams Klinik in Steilshoop trafen die Runner auf Ronin und übernahmen einen Auftrag: dringend benötigtes Medikament für die kranke Juna aus einem von den Bakhtari kontrollierten Depot beschaffen. Beim Zugriff kreuzten sich ihre Wege mit der Vory. Als sie zurückkamen, war ein Team gut ausgerüsteter Profis dabei, Juna aus der Klinik zu entführen — jemand mit Geld will das Mädchen. Die Runner schlugen den Zugriff zurück, verhörten und „entsorgten“ über die Triaden einen Gefangenen und brachten Juna in Sicherheit.',
   '[]',30],
];
const insRun = db.prepare(`INSERT OR IGNORE INTO runs (slug,number,title,date_played,participants,summary,images,sort) VALUES (?,?,?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM runs').get().c === 0)
  for (const r of runs) insRun.run(...r);

// ---------- TIMELINE ----------
const tl = [
  ['Tag 0','Sturmtief „Njord“ baut sich auf','Hamburg bereitet sich auf einen Jahrhundertsturm vor.',null,10],
  ['Run 0','Extraktion Dr. Foss','Foss gerettet, ein Proteus-Eingreifteam zerschlagen, das Codewort „Medusa“ taucht auf.','run-0',20],
  ['Run 0 → 1','Sparks & Bull stoßen dazu','Beim Katerfrühstück schließt sich die Runde zusammen.',null,25],
  ['Run 1','Sperrwerk & Watt','Floodgates notdürftig gesichert, Wattsammler gerettet, ein Wasser-Avatar erscheint, die singende Kiste geht an Svenja.','run-1',30],
  ['Zwischen 1 & 2','Erfolglose magische Recherche','Die Gruppe befragt magische Kontakte zur Kiste — ohne Ergebnis.',null,35],
  ['Run 2','Kein Ort zum Heilen','Juna in Bisams Klinik beschützt, Medikament beschafft, ein Entführungsteam zurückgeschlagen, Juna in Sicherheit.','run-2',40],
];
const insTl = db.prepare(`INSERT OR IGNORE INTO timeline (when_label,title,body,run_slug,sort) VALUES (?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM timeline').get().c === 0)
  for (const t of tl) insTl.run(...t);

// ---------- METAPLOT (nur SL) ----------
const meta = [
  ['hdl-benjamin','HDL','Benjamin','HDL — Hintergrundebene (Benjamin)',
   'Nur für die Spielleitung. Der grosse Hintergrund-Plot dieser Runde. Solange die Spieler noch nicht erkannt haben, worum es geht, bleibt es bei „HDL“. Inhalte werden hier von der SL gepflegt.', now()],
  ['meta-alex','META','Alex','Metaplot (Alex)',
   'Platzhalter-Kachel für Alex’ eigene Hintergrundebene, falls vorhanden. Von der SL pflegbar.', now()],
];
const insMeta = db.prepare(`INSERT OR IGNORE INTO metaplot (slug,code,owner,title,body,updated_at) VALUES (?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM metaplot').get().c === 0)
  for (const m of meta) insMeta.run(...m);


// ---------- MAPS ----------
const maps = [
  ['hamburg','Hamburg — Übersicht','/static/img/maps/hamburg.jpg','Bezirke und besondere Orte der Stadt (Quellenband-Karte).',10],
  ['wild-ost','Wild Ost','/static/img/maps/wildost.jpg','Detailkarte des Sektors Wild Ost.',20],
];
const insMap = db.prepare(`INSERT OR IGNORE INTO maps (slug,title,image,note,sort) VALUES (?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM maps').get().c === 0)
  for (const m of maps) insMap.run(...m);

console.log('Seed OK. Default-Passwort fuer alle Logins:', PW);
console.log('Logins:', users.map(u=>u[0]).join(', '));
