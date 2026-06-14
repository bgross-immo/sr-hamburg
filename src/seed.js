const bcrypt = require('bcryptjs');
const db = require('./db');

const PW = process.env.SEED_DEFAULT_PASSWORD || 'hamburg';
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
const resetUser = db.prepare(`UPDATE users SET password_hash=?, role=? WHERE username=? AND must_change=1`);
for (const [u, d, r] of users) { insUser.run(u, d, r, hash); resetUser.run(hash, r, u); }

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
  ['bull','Bull','Sigi','Minotaurus, 17','Ki-Adept (Nahkaempfer)',
   'Erwacht, schamanisch (Materialization), Mentor Beasts.',
   'Junger Minotaur aus dem Alten Land, tier-/naturverbunden, Hund „Frodo“; tagsüber Türsteher.',
   'Gehörnter Nahkampf „Goring Horns“, traditioneller Bogen St.8.',
   'Sehr jung (17); Maria Juanes als möglicher Verräter-Kontakt.',
   'Dr. Bisam, Käpt’n Svenja, Laura Kowalski, Maria Juanes (Konzern-Headhunterin), Matthias Tiefenried, Frodo (Hund)',30],
  ['ermina','Ermina','Sigi','Elf, 23','Chameleon (Face & Einbrecherin)',
   'Mundan.',
   'Aristokratische, vielsprachige High-Society-Verhandlerin & Infiltratorin; Oberschicht.',
   '—',
   'Familien-Aufhänger (Reanka); Kaltenstein-Patronage als Hebel.',
   'Elyria Reanka (vermutlich Familie), Kaltenstein (Großer Drache, Feldberg)',31],
  ['walpurga','Walpurga','Sigi','Mensch, 28','Hexe (Heilerin & Tierbeherrscherin)',
   'Erwacht, Tradition Brockenhexen (Materialization), Initiation 1, Abwehrmagie.',
   'Rothaarige Hexe eines Zirkels; schlechter Ruf 1; Mittelschicht.',
   '—',
   'Verpflichtung gegenüber dem Hexenzirkel „Brokenhexen“.',
   'Brokenhexen (Hexenzirkel), WG-Sani, WG-Studi',32],
  // Stubs (Bögen folgen)
  ['multitool','Multitool','Patric','—','—',
   '—','Bogen folgt.','—','Connection: ein Hacker-Kontakt (in Run 1 am Sperrwerk genutzt).','Hacker-Kontakt (Name folgt)',40],
  ['wardoc','WarDoc','Patric','Ork','Combat Medic / Strassendoc',
   'Mundan (vermutlich).','Orkischer Sanitaeter, der das Team im Feld zusammenflickt. Robust und ruppig. Bogen folgt.','—','Details/Bogen folgen.','—',46],
  ['sparks','Sparks','Max','Hobgoblin','Chaosmagier',
   'Erwacht (Chaosmagier).','War in der Clubnacht; kennt Multitool. Bogen folgt.','—','—','Multitool',41],
  ['ronin','Ronin','Max','Mensch (schwer cybered, Essenz ~2,2)','Street Samurai',
   'Mundan; stark verkybert.',
   'Herrenloser Samurai (Kaori Sato). Schnell und toedlich im Nahkampf und mit Schusswaffen, Akrobatik und Infiltration. Lebt auf einem Hotelschiff. In Run 2 in Bisams Klinik dazugestossen.',
   'Klingenwaffen + Ares Crusader II u.a.; mehrere Initiative-Durchgaenge.',
   'Werte aus handschriftlichem Bogen — Details ggf. von Max bestaetigen.',
   'Mehrere: Schieber, Waffenhaendler, Rettungssanitaeter, Fixerin (Loyalitaet/Einfluss notiert)',42],
  ['hi-no','Hi No','Sigi','—','—',
   '—',
   'Vierter Charakter von Sigi, nicht in seiner regulaeren Dreierauswahl. War beim Weihnachtsrun „Stille Nacht, toedliche Nacht“ dabei. Details folgen von Sigi.',
   '—','—','—',43],
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


// ---------- Charakter: Owner-Zuordnung + Johnson-Backfill ----------
const userByName = {};
for (const u of db.prepare('SELECT id,display_name,username FROM users').all()) {
  userByName[(u.display_name||'').toLowerCase()] = u.id;
  userByName[(u.username||'').toLowerCase()] = u.id;
}
const dossiers = {
  'buffy':['Erwachte Magierin mit Spezialgebiet Geister — Beschwoeren und Bannen. Albino, faellt auf, gilt als Beschuetzertyp. Teuer, aber grundsolide bei allem Astralen.','Beschwoeren · Bannen · Astralkampf · Heilung'],
  'kapitaen-flint':['Ork-Rigger und Schmuggler mit eigenem U-Boot. Kennt jede Route auf der Elbe, redet viel, liefert meist.','Schiffe/Boote · Riggen · Schmuggel · Geschuetze'],
  'kiezchronist':['Elf, Decker und wandelndes Adressbuch des Kiez. Weiss, was auf der Strasse laeuft, verkauft Infos. Immer pleite.','Hacking · Matrix · Infohandel · Kiez-Kontakte'],
  'mondkind':['Eleganter Elf, Magier und Geschichtenerzaehler. Bestens vernetzt bis in hohe Kreise, charmanter Verhandler.','Ritualmagie · Beschwoeren · Verhandlung · Beziehungen'],
  'al-be-rich':['Zwergischer Technomancer und Mechaniker-Allrounder mit gepanzertem Werkstatt-Fahrzeug. Eigenbroetlerisch, paranoid.','Technomantie · Maschinen · Fahrzeuge · Drohnen'],
  'seven-lifes':['Saechsischer Decker, drogen- und tech-gepusht, mit Drohnen-Support. Flexibel, etwas chaotisch.','Hacking · Drohnen · Chemie · Schusswaffen'],
  'bull':['Junger Minotaurus, erwachter Nahkaempfer mit Hoernern und Bogen. Tuersteher, tierverbunden, brutal im Clinch.','Nahkampf · Bogen · Adeptenkraefte · Natur'],
  'ermina':['Elfische Verhandlerin der Oberklasse, vielsprachig, betoerend. Oeffnet Tueren, die anderen verschlossen bleiben.','Verhandlung · Fuehrung · Etikette · Sprachen'],
  'walpurga':['Menschliche Hexe, Heil- und Unterstuetzungsmagie, Mitglied eines Zirkels. Haelt das Team am Leben.','Heilzauber · Rituale · Abwehrmagie'],
  'ronin':['Schwer verkyberter Strassensamurai. Schnell, toedlich mit Klinge und Pistole. Wenig Worte.','Klingen · Pistolen · Akrobatik · Infiltration'],
  'patchdoc':['Erwachter Strassendoc mit Tech-Schlag — flickt Koerper und Code gleichermassen. Ungewoehnliche Erscheinung.','Medizin · Magie · Computer/Hardware · Hacking'],
  'sparks':['Hobgoblin-Chaosmagier, unberechenbar. War schon vor dem Job auf der Tanzflaeche.','Chaosmagie · Zauber'],
  'wardoc':['Orkischer Combat-Medic. Holt Leute aus dem Feuer und flickt sie wieder zusammen. Robust, ruppig, zuverlaessig.','Medizin · Erste Hilfe · Biotech · Robust'],
};
const portraitData = {
  'al-be-rich':['/static/img/chars/al-be-rich.jpg'],
  'buffy':['/static/img/chars/buffy.jpg','/static/img/chars/buffy-2.jpg'],
  'bull':['/static/img/chars/bull.jpg'],
  'ermina':['/static/img/chars/ermina.jpg'],
  'kapitaen-flint':['/static/img/chars/kapitaen-flint.jpg'],
  'kiezchronist':['/static/img/chars/kiezchronist.jpg'],
  'mondkind':['/static/img/chars/mondkind.jpg'],
  'seven-lifes':['/static/img/chars/seven-lifes.jpg'],
  'walpurga':['/static/img/chars/walpurga.jpg'],
  'ronin':['/static/img/chars/ronin.jpg'],
  'wardoc':['/static/img/chars/wardoc.jpg','/static/img/chars/wardoc-2.jpg'],
};
let slSum = {};
try { slSum = require('./sl_summaries.json'); } catch (e) { console.error('sl_summaries', e); }
const knowsMap = { 'bull':'Mondkind, Multitool, Random, Sparks', 'walpurga':'WarDoc (Trauma), Buffy' };
const bfChar = db.prepare('UPDATE characters SET owner_id=COALESCE(owner_id,?), johnson_dossier=COALESCE(johnson_dossier,?), highlight_skills=COALESCE(highlight_skills,?), image=COALESCE(image,?), gallery=COALESCE(gallery,?), sl_summary=COALESCE(sl_summary,?), knows=COALESCE(knows,?) WHERE slug=?');
for (const c of characters) {
  const oid = userByName[(c[2]||'').toLowerCase()] || null;
  const d = dossiers[c[0]] || [null,null];
  const arr = portraitData[c[0]] || null;
  const img = arr ? arr[0] : null;
  const gal = arr ? JSON.stringify(arr) : null;
  bfChar.run(oid, d[0], d[1], img, gal, slSum[c[0]]||null, knowsMap[c[0]]||null, c[0]);
}

// ---------- CONNECTIONS (Spielerwissen, keine Plot-Geheimnisse) ----------
const connections = [
  ['dr-bisam','Dr. Bisam','Straßendoc','Mandelzirkel / Ghule (Verbündete)','Steilshoop, an der Friedhofsmauer','Behandelt jeden ohne SIN-Fragen; Barzahlung; Zigaretten','Verbündeter',
   'Versorgte das Wattsammler-Mädchen Juna nach „Das Auge des Sturms“ und gab der Gruppe in „Kein Ort zum Heilen“ den Auftrag, Medikament zu beschaffen. Klinik wurde von Profis angegriffen.','Bull, Seven Lifes',1],
  ['svenja','Käpt’n Svenja','Likedeeler-Kapitänin','Likedeeler (Verbündete)','Dock 4, Finkenwerder','Freiheit der Elbe; hält ihr Wort','Verbündete',
   'Warnte die Gruppe in „Das Auge des Sturms“ vor Vester, heuerte sie an und nahm die verschleierte Kiste in Verwahrung.','Bull',1],
  ['kaltenstein','Kaltenstein','Großer westlicher Drache','Bewahrer','Feldberg','Stabilität, langfristiges Spiel','Patron (sehr distanziert)',
   'Ein Drache als Connection — außergewöhnlich. Kommuniziert selten und nie umsonst.','Ermina',1],
  ['seedrachin','Seedrachin','Große Drachin (Meer)','Naturgewalt','Nordsee / Watt','Reinheit der See','Unberechenbar',
   'Manifestierte sich in „Das Auge des Sturms“ als gewaltiger Wasser-Avatar.','Mondkind',1],
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
  ['maria-juanes','Maria Juanes','Konzern-Headhunterin','Konzern','Hamburg','Talente abwerben','Konzern-Kontakt',
   'Wirbt Talente fuer Konzerne ab.','Bull',0],
  ['multitool-hacker','Multitools Hacker-Kontakt','Hacker','—','Hamburg (Matrix)','—','Kontakt (Name folgt)',
   'Half der Gruppe in „Das Auge des Sturms“, am Sperrwerk ins System einzugreifen — nur knapp gelungen.','Multitool',0],
  ['van-den-berg','Herr van den Berg','Logistik-Manager (Saeder-Krupp)','Saeder-Krupp','Hamburg / Speicherstadt','gestresst; zahlt ueber Konzern-Kanaele','Auftraggeber','Heuerte die Runner in „Stille Nacht, toedliche Nacht“ an, die entfuehrte Luxus-Drohne „S-K Knecht Ruprecht 3000“ fuer seinen Sohn zu bergen.','',0],
  ['gregor','Pater Gregor','Priester / Weg der Reinheit','Weg der Reinheit','Steilshoop / Suppenkueche','wirkt aufrichtig hilfsbereit','Bekannt','Tauchte in „Kein Ort zum Heilen“ in Bisams Klinik auf, brachte Vorraete und half nach dem Angriff.','',0],
  ['groot','Konsul Juergen Groot','Konsul / Auftraggeber','','Elbphilharmonie / Speicherstadt','hanseatische Diskretion, zahlt gut','Auftraggeber','Heuerte die Runner in „Die undichte Stelle“ an, Dr. Foss zu extrahieren. Verachtet Proteus.','',0],
  ['juna','Juna','Wattsammler-Maedchen / Medium','Wattsammler','zuletzt bei Dr. Bisam','—','Schutzbefohlene','Junges Maedchen mit goldglimmenden Adern und einer Verbindung zu der singenden Kiste. In „Das Auge des Sturms“ gerettet, danach in Bisams Obhut.','',0],
  ['haifisch-vester','Jens „Haifisch“ Vester','Ork, Likedeeler-Anfuehrer','Likedeeler','St. Pauli / Hafen','Vorherrschaft unter den Piraten','Windig / unzuverlaessig','Bot in „Das Auge des Sturms“ einen falschen Bergungsjob an, der ein Massaker an Wattsammlern gewesen waere. Die Runner lehnten ab.','',0],
];
const insConn = db.prepare(`INSERT OR IGNORE INTO connections (slug,name,role,faction,location,preferences,status,history,shared_by,campaign_relevant) VALUES (?,?,?,?,?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM connections').get().c === 0)
  for (const c of connections) insConn.run(...c);

// ---------- RUNS (Spielersicht, spoilerfrei) ----------
const benId = (db.prepare("SELECT id FROM users WHERE username='benjamin'").get() || {}).id || 1;
const runs = [
  { slug:'run-0', number:'Run 0', title:'Die undichte Stelle', date_played:'Vor dem Orkan „Njord“',
    participants:'Random, Multitool, Mondkind',
    location:'HafenCity · Wilhelmsburg · St. Pauli', time_from:'früher Abend', time_to:'Nacht (kurz vor der Flut)',
    karma:'6', nuyen:'2.500¥ pro Person', loot:'—',
    new_connections:'Konsul Jürgen Groot, Dr. Arvid Foss', involved_connections:'Konsul Jürgen Groot',
    actors:'Proteus (Eingreifteam) · Tech-Squatter („Rust-Punx“)',
    summary:`Sturmtief Njord baute sich ueber Hamburg auf, als Konsul Juergen Groot die Runner in den VIP-Bereich der Elbphilharmonie bestellte — teurer Kaffee, Panoramablick auf den absaufenden Hafen. Der Auftrag: den abtruennigen Proteus-Hydrologen Dr. Arvid Foss lebend aus einem stillgelegten Pumpwerk in Wilhelmsburg holen, samt der Beweise, die er bei sich trug — bevor der Konzern ihn zum Schweigen brachte. Der Weg nach Wildost wurde zur Zeitreise in den Abgrund: knoecheltiefes Elbwasser, Pluenderer, eine Zollstation lokaler Ganger. Im Pumpwerk hatte sich Foss bei einer Kommune von Tech-Squattern verschanzt; erst nachdem die Runner bewiesen, dass sie gegen Proteus standen, liess man sie zu ihm. Foss war paranoid, auf seinem Datenchip ein Codewort: Medusa. Kaum hatten sie ihn, schlug ein Proteus-Eingreifteam zu — lautlose Profis, schwarze Panzerung, Kampfdrohne. Von den Laufstegen aus schlugen die Runner sie zurueck, toeteten mehrere Operative und flohen mit Foss durch einen Wartungsschacht in den Sturm. Im Klabautermann in St. Pauli uebergaben sie Foss und Chip an Groot. Beim Katerfruehstueck stiessen Sparks und Bull dazu — frisch aus einer Clubnacht — und die Runde war sich einig: Man kann die Menschen nicht einfach absaufen lassen.` },
  { slug:'run-1', number:'Run 1', title:'Das Auge des Sturms', date_played:'Orkan „Njord“, Nacht',
    participants:'Random, Multitool, Mondkind, Bull, Sparks',
    location:'St. Pauli · Finkenwerder · Nordsee/Watt · Flak-Turm', time_from:'Abend ~20:00', time_to:'tiefe Nacht ~23:45',
    karma:'12', nuyen:'3.000¥ pro Person (Likedeeler/Svenja)', loot:'—',
    new_connections:'Käpt’n Svenja, Olaf „Schlickteufel“, Dr. Bisam, Juna',
    involved_connections:'Käpt’n Svenja',
    actors:'Likedeeler (Svenja & Vester) · Rote Korsaren · Wattsammler · ein Wasser-Avatar · Proteus (Drohne/Beobachter)',
    summary:`Noch im Klabautermann, auf dem Hoehepunkt des Orkans, draengte sich der Ork Jens „Haifisch“ Vester mit seinen Likedeelern an die Bar und bot einen „Bergungsjob“ auf einem alten Flak-Turm im Watt — die Runner lehnten ab. Stattdessen nahmen sie sich der Schleusen-Sache an: ueber einen Hacker-Kontakt von Multitool griffen sie an einem Sperrwerk ins System ein und brachten die Flutschutztore gerade noch unter Kontrolle. Dann zu Kaeptn Svenja nach Finkenwerder, Dock 4. Sie war verletzt, ihre Leute — Wattsammler unter Olaf „Schlickteufel“ — sassen auf dem Flak-Turm Trutzburg weit draussen fest. Mit Svenjas gepanzertem Boot „Die Nadel“ stachen die Runner in den Orkan; eine Proteus-Drohne der Manta-Klasse beschattete sie, ein abgefangenes Protokoll zeigte: Sie wurden absichtlich durchgelassen, als Koeder. Im Turm fanden sie die kranken Wattsammler — und Juna, ein Maedchen mit schwach golden leuchtenden Adern, das eine singende Kiste umklammerte. Dann stuermten die Roten Korsaren auf Kampfdroge den Turm. Die Runner verteidigten die Zivilisten und toeteten den Anfuehrer, den Maat. Auf dem Hoehepunkt zog sich das Wasser zurueck — und ein gewaltiger Avatar aus Wasser, Wrackteilen und Phosphor erhob sich, zermalmte die Korsaren-Boote und verschluckte den Maat. Die Runner flohen, retteten die Wattsammler und uebergaben die magisch verschleierte Kiste an Svenja. Das katatonische Maedchen Juna nahm der Strassendoc Dr. Bisam mit in seine Klinik.` },
  { slug:'run-2', number:'Run 2', title:'Kein Ort zum Heilen', date_played:'Der Morgen nach dem Sturm',
    participants:'Bull, Mondkind, Ronin, Multitool',
    location:'Steilshoop', time_from:'Morgen nach dem Sturm', time_to:'später Vormittag',
    karma:'16 gesamt (Teil 1: 6 · Teil 2: 10)',
    nuyen:'Loot-Verkauf 3.000¥ gesamt (je 1.000¥ an Bull, Mondkind, Ronin); Bisam-Lohn abgelehnt; −5.000¥ an die Triaden (Verhör/Entsorgung)',
    loot:'Medikament (Auftragsziel) + verkaufter Depot-Loot',
    new_connections:'—', involved_connections:'Dr. Bisam',
    actors:'Bakhtari-Clan · Vory · unbekanntes Extraktionsteam',
    summary:`Der Morgen nach dem Sturm, Steilshoop. In Dr. Bisams Klinik trafen die Runner auf Ronin und auf Juna, die in der Nacht schwere Anfaelle gehabt hatte — ihr Nervensystem reagierte auf etwas, das nicht physisch war. Bisam brauchte dringend Neocortizin, ein seltenes Antikonvulsivum; sein Vorrat lag in einem von den Bakhtari kontrollierten ehemaligen Sanitaetsstuetzpunkt. Selbst hin konnte er nicht — also uebernahmen die Runner. Im Depot zwischen surrenden Kuehlkammern kreuzten sich ihre Wege mit der Vory, die dieselbe Idee hatte; man einigte sich pragmatisch, die Runner sicherten das Medikament. Doch als sie zurueckkamen, war ein Team gut ausgeruesteter Profis in Zivil dabei, Juna zu entfuehren — jemand mit Geld wollte das Maedchen. Die Runner schlugen den Zugriff zurueck, Bisam kam mit einem blauen Auge davon. Ueber die Triaden liessen sie einen Gefangenen verhoeren und entsorgen und brachten Juna in Sicherheit. Pater Gregor vom Weg der Reinheit, der gegenueber eine Suppenkueche betrieb, half nach dem Angriff aus und bot der Klinik seinen Schutz an.` },
  { slug:'retten-seebunker-kid', number:'', title:'Retten des reichen Kids aus dem Seebunker', date_played:'vor den HDL-Runs', karma:'10', summary:'Details werden von der Spielleitung (Alex) ergaenzt.', owner:'alex', sort:5 },
  { slug:'weihnachtsrun', number:'', title:'Stille Nacht, toedliche Nacht', date_played:'Weihnachten', karma:'12', participants:'Random, Seven Lifes, Ronin, Hi No', new_connections:'Herr van den Berg', actors:'Saeder-Krupp · Ghul-Piraten (Kaeptn Klabauter) · HanSec', summary:`Weihnachten in Hamburg, saurer Schneeregen ueber dem historischen Weihnachtsmarkt in der Speicherstadt. Dort sprach Herr van den Berg die Runner an — ein voellig fertiger Logistik-Manager von Saeder-Krupp. Sein Sohn hatte sich den „S-K Knecht Ruprecht 3000“ gewuenscht, eine 2,50 m grosse Luxus-Drohne im Weihnachtsmann-Look; die Lieferung war im Hafen abgefangen worden. Auftrag: die Drohne bergen, mit Bonus fuer das unbeschaedigte Spielzeug im Sack. Die Spur fuehrte ueber Pier und Hafenueberwachung aufs Wasser — zu einem halb gesunkenen Frachter im Muehlenberger Loch, der „MS Hanse-Teufel“. Das Schiff war in der Hand von Ghul-Piraten unter „Kaeptn Klabauter“, einem Ghul-Adepten. Sie hatten die Drohne laienhaft umprogrammiert: Auf dem vereisten Oberdeck patrouillierte der „Cyber-Santa“, hielt jeden fuer „unartig“ und zitierte ueber Lautsprecher die Suenden der Runner, waehrend aus den dunklen Frachtraeumen die Ghule angriffen. Mitten im Gefecht tauchte HanSec auf, vom Laerm angelockt — es folgte die Flucht ueber die Elbe und durch die Fleete. Offiziell hiess es danach in den Nachrichten, Spezialeinheiten haetten einen Terroranschlag im Hafen vereitelt und Verdaechtige neutralisiert. Spaeter tauchte die Drohne in den Medien wieder auf — bei der Urban-Brawl-Mannschaft von van den Bergs Sohn.`, owner:'benjamin', sort:7 },
  { slug:'vier-naegel', number:'', title:'4 Naegel stehlen', date_played:'parallel zu den HDL-Runs (Datum: Alex)', karma:'10', summary:'Details werden von der Spielleitung (Alex) ergaenzt.', owner:'alex', sort:40 },
  { slug:'zenzus-retten', number:'', title:'Zenzus retten', date_played:'parallel zu den HDL-Runs (Datum: Alex)', karma:'10', summary:'Details werden von der Spielleitung (Alex) ergaenzt.', owner:'alex', sort:50 },
  { slug:'klaerwerk-toxischer-geist', number:'', title:'Klaerwerk - Toxischer Geist', date_played:'parallel zu den HDL-Runs (Datum: Alex)', karma:'10', summary:'Details werden von der Spielleitung (Alex) ergaenzt.', owner:'alex', sort:60 },
  { slug:'untertauchen-klaerwerk', number:'', title:'Untertauchen nach dem Klaerwerk', date_played:'parallel zu den HDL-Runs (Datum: Alex)', karma:'10', summary:'Details werden von der Spielleitung (Alex) ergaenzt.', owner:'alex', sort:65 },
];
const rcols = ['slug','number','title','date_played','participants','location','time_from','time_to','karma','nuyen','loot','new_connections','involved_connections','actors','summary'];
const insRun = db.prepare(`INSERT OR IGNORE INTO runs (${rcols.join(',')},images,owner_id,sort) VALUES (${rcols.map(()=>'?').join(',')},'[]',?,?)`);
const bfRun = db.prepare(`UPDATE runs SET location=COALESCE(location,?), time_from=COALESCE(time_from,?), time_to=COALESCE(time_to,?), karma=COALESCE(karma,?), nuyen=COALESCE(nuyen,?), loot=COALESCE(loot,?), new_connections=COALESCE(new_connections,?), involved_connections=COALESCE(involved_connections,?), actors=COALESCE(actors,?), owner_id=COALESCE(owner_id,?) WHERE slug=?`);
const uid = (un) => (db.prepare('SELECT id FROM users WHERE username=?').get(un) || {}).id || benId;
let _ri = 0;
for (const r of runs) {
  const oid = uid(r.owner || 'benjamin');
  const so = (r.sort != null) ? r.sort : 10 + (_ri * 10);
  _ri++;
  insRun.run(...rcols.map(c => (r[c] == null ? '' : r[c])), oid, so);
  if (r.participants) db.prepare("UPDATE runs SET participants=? WHERE slug=? AND (participants IS NULL OR participants='')").run(r.participants, r.slug);
  if (r.new_connections) db.prepare("UPDATE runs SET new_connections=? WHERE slug=? AND (new_connections IS NULL OR new_connections='')").run(r.new_connections, r.slug);
  bfRun.run(r.location||'', r.time_from||'', r.time_to||'', r.karma||'', r.nuyen||'', r.loot||'', r.new_connections||'', r.involved_connections||'', r.actors||'', oid, r.slug);
}

// Run-Bilder (nur setzen, wenn noch keine vorhanden)
let runImgs = {};
try { runImgs = require('./run_images.json'); } catch (e) {}
const bfRunImg = db.prepare("UPDATE runs SET images=? WHERE slug=? AND (images IS NULL OR images='' OR images='[]')");
for (const [sl, arr] of Object.entries(runImgs)) bfRunImg.run(JSON.stringify(arr), sl);

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


// ---------- FRAKTIONEN (Spielerwissen, spoilerfrei) ----------
const factions = [
  ['likedeeler','Likedeeler','Piraten / Freibeuter','Gemischt',
   'Die freien Schiffer und Schmuggler der Elbe. Gespalten: ein traditioneller Fluegel um Kaeptn Svenja haelt zur Stadt, andere wie Jens Vester spielen ihr eigenes Spiel.','Kaeptn Svenja, Jens „Haifisch“ Vester, Warentester Klaas',10],
  ['proteus','Proteus','Konzern (AA)','Undurchsichtig / gegnerisch',
   'Ein verschwiegener Meerestechnik-Konzern mit Arkologien in der Nordsee. Die Runde geriet bereits mit Proteus aneinander. Was sie wirklich vorhaben, ist offen.','—',30],
  ['mandelzirkel','Mandelzirkel','Spirituelle Gemeinschaft','Verbuendet / neutral',
   'Ein Bund von Geisterkundigen und Voodoo-Praktizierenden, der fuer das spirituelle Gleichgewicht der Stadt einsteht.','Mama Mamba',40],
  ['wattsammler','Wattsammler','Kommune','Neutral / schutzbeduerftig',
   'Eine raue Gemeinschaft, die im Watt von dem lebt, was die Gezeiten freigeben. In Run 1 vom Flak-Turm gerettet.','Olaf „Schlickteufel“, Juna',50],
  ['rote-korsaren','Rote Korsaren','Piraten','Feindlich',
   'Brutale, drogengepushte Freibeuter, die in fremden Revieren wildern. In „Das Auge des Sturms“ stuermten sie den Flak-Turm.','Der Maat (gefallen)',60],
  ['vory','Vory v Zakone','Syndikat','Neutral (pragmatisch)',
   'Russisches Verbrechersyndikat, kontrolliert Logistik und Schwarzmarkt. In „Kein Ort zum Heilen“ kreuzten sich die Wege im Depot.','—',70],
  ['triaden','Triaden','Syndikat','Dienstleister (neutral)',
   'Spezialisiert auf diskrete Dienste, Artefakte und Schmuggel. In „Kein Ort zum Heilen“ fuer Verhoer und Entsorgung engagiert.','—',80],
  ['bakhtari-clan','Bakhtari-Clan','Lokaler Clan','Neutral (territorial)',
   'Beherrscht Teile von Steilshoop; pragmatisch, solange man sein Revier respektiert.','Cihan Bakhtari',90],
  ['weg-der-reinheit','Weg der Reinheit','Buergerbewegung','Hilfsbereit (Stand des Wissens)',
   'Eine quasi-religioese Wohltaetigkeitsbewegung, die nach dem Sturm Feldlazarette und Suppenkuechen betreibt. Pater Gregor gilt als Wohltaeter.','Pater Gregor',100],
];
const insFac = db.prepare(`INSERT OR IGNORE INTO factions (slug,name,category,status,description,notable_members,sort) VALUES (?,?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM factions').get().c === 0)
  for (const f of factions) insFac.run(...f);


// ---------- Connections: Einflussstufen (aus den Charakterboegen) ----------
const infl = { 'dr-bisam':'4','svenja':'4','kaltenstein':'12','seedrachin':'9','mama-mamba':'5','warentester-klaas':'5','myriam-teleam':'10','undine-glaser':'3','schelle-neumeister':'3','laura-kowalski':'4','pozi':'4','maria-juanes':'5','van-den-berg':'unbekannt' };
const bfInf = db.prepare('UPDATE connections SET influence=COALESCE(influence,?) WHERE slug=?');
for (const [sl, v] of Object.entries(infl)) bfInf.run(v, sl);
const bfConnImg = db.prepare('UPDATE connections SET image=COALESCE(image,?) WHERE slug=?');
bfConnImg.run('/static/img/conns/van-den-berg.png','van-den-berg');

// ---------- LOCATIONS (Spielerwissen, spoilerfrei) ----------
const locations = [
  ['klabautermann','Der Klabautermann','St. Pauli','Schatten-Kneipe','Anlaufpunkt / neutraler Boden','Kellerkneipe und Umschlagplatz fuer Auftraege. Hier nahm vieles seinen Anfang.','—',10],
  ['bisam-klinik','Dr. Bisams Klinik','Steilshoop (an der Friedhofsmauer)','Strassenklinik','Sicherer Hafen','Behandelt jeden ohne SIN-Fragen. In „Kein Ort zum Heilen“ von Profis angegriffen.','Dr. Bisam',20],
  ['dock-4','Dock 4','Finkenwerder','Wartungsdock','Likedeeler-Stuetzpunkt','Svenjas geheimes Dock und Heimathafen der „Trotzdem“.','Kaeptn Svenja',30],
  ['flak-turm','Flak-Turm „Trutzburg“','Nordsee / Watt','Alter Flakturm','Wattsammler-Basis','Aus dem Wasser ragender Betonturm; in „Das Auge des Sturms“ Schauplatz des Korsaren-Angriffs.','Olaf „Schlickteufel“',40],
  ['steilshoop','Steilshoop','Bezirk Wandsbek','Hochhaus-Kiez','Territorium','Grauer Plattenbau-Kiez; Platzhirsch ist der Bakhtari-Clan. Bisams Revier.','Bakhtari-Clan',50],
  ['sanitaetsstuetzpunkt','Ehemaliger Sanitaetsstuetzpunkt','Steilshoop','Aufgegebenes Depot','Bakhtari-Lager','Notversorgung nach der Schwarzen Flut, heute Bakhtari-Kuehllager („Kein Ort zum Heilen“).','—',60],
  ['ms-hanse-teufel','MS Hanse-Teufel','Muehlenberger Loch (Elbe)','Gestrandeter Frachter','Schauplatz','Halb gesunkener Schuettgutfrachter im Schlick; in „Stille Nacht, toedliche Nacht“ Versteck von Ghul-Piraten und der entfuehrten Drohne.','—',70],
  ['ohlsdorfer-friedhof','Ohlsdorfer Friedhof','Ohlsdorf','Friedhof','Neutraler Boden','Weitlaeufiges, stilles Reich; Treffpunkt im Schatten.','—',80],
  ['elbphilharmonie','Elbphilharmonie','HafenCity','Wahrzeichen / VIP','Treffpunkt der feinen Leute','Glaeserner Elfenbeinturm ueber dem Hafen; Schauplatz des Auftrags in „Die undichte Stelle“.','—',90],
];
const insLoc = db.prepare(`INSERT OR IGNORE INTO locations (slug,name,area,type,status,description,notable,sort) VALUES (?,?,?,?,?,?,?,?)`);
if (db.prepare('SELECT COUNT(*) c FROM locations').get().c === 0)
  for (const l of locations) insLoc.run(...l);
const bfLocImg = db.prepare('UPDATE locations SET image=COALESCE(image,?) WHERE slug=?');
bfLocImg.run('/static/img/locations/ms-hanse-teufel.jpg','ms-hanse-teufel');

try { db.prepare('DELETE FROM locations WHERE slug=?').run('schwarzer-garten'); } catch (e) {}
try { db.prepare('DELETE FROM factions WHERE slug=?').run('aeltermaenner'); } catch (e) {}
try { db.prepare('DELETE FROM connections WHERE slug=?').run('senator-von-ahrensburg'); } catch (e) {}
console.log('Seed OK. Default-Passwort fuer alle Logins:', PW);
console.log('Logins:', users.map(u=>u[0]).join(', '));
